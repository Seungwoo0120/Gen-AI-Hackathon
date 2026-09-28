import asyncio
import json
import re
import unicodedata
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import cast
from urllib.request import urlopen

from starlette.concurrency import run_in_threadpool

from app.adapters.ae.base import (
    AeHospitalWaitTime,
    AeSourceUnavailable,
    AeWaitTimesResponse,
    LocalizedText,
)

# Verified against the live HA files on 2026-09-27:
# https://www.ha.org.hk/opendata/aed/aedwtdata2-en.json
# https://www.ha.org.hk/opendata/aed/aedwtdata2-tc.json
ENGLISH_URL = "https://www.ha.org.hk/opendata/aed/aedwtdata2-en.json"
TRADITIONAL_CHINESE_URL = "https://www.ha.org.hk/opendata/aed/aedwtdata2-tc.json"
HTTP_TIMEOUT_SECONDS = 10
CACHE_TTL = timedelta(minutes=15)
# After a failed refresh, serve the cache without refetching for this long, so an
# HA outage doesn't make every request wait for network timeouts.
RETRY_AFTER_FAILURE = timedelta(minutes=1)
# Older data is not shown at all: hours-old waiting times would mislead.
MAX_STALE_AGE = timedelta(hours=2)
HONG_KONG_TIMEZONE = timezone(timedelta(hours=8))

JsonPayload = dict[str, object]
FetchJson = Callable[[str], JsonPayload]
Clock = Callable[[], datetime]

# HA's two files share no hospital ID and could be ordered differently, so they are
# joined by name. Pairs taken from the live HA files on 2026-09-27. A hospital
# missing here still shows, with English text only.
HOSPITAL_NAMES_ZH_HANT = {
    "Alice Ho Miu Ling Nethersole Hospital": "雅麗氏何妙齡那打素醫院",
    "Caritas Medical Centre": "明愛醫院",
    "Kwong Wah Hospital": "廣華醫院",
    "North District Hospital": "北區醫院",
    "North Lantau Hospital": "北大嶼山醫院",
    "Pamela Youde Nethersole Eastern Hospital": "東區尤德夫人那打素醫院",
    "Pok Oi Hospital": "博愛醫院",
    "Prince of Wales Hospital": "威爾斯親王醫院",
    "Princess Margaret Hospital": "瑪嘉烈醫院",
    "Queen Elizabeth Hospital": "伊利沙伯醫院",
    "Queen Mary Hospital": "瑪麗醫院",
    "Ruttonjee Hospital": "律敦治醫院",
    "St John Hospital": "長洲醫院",
    "Tin Shui Wai Hospital": "天水圍醫院",
    "Tseung Kwan O Hospital": "將軍澳醫院",
    "Tuen Mun Hospital": "屯門醫院",
    "United Christian Hospital": "基督教聯合醫院",
    "Yan Chai Hospital": "仁濟醫院",
}

_WAIT_TEXT_PATTERN = re.compile(
    r"(?:(?:around|over|within|less\s+than)\s+)?"
    r"(?P<value>\d+(?:\.\d+)?)\s+"
    r"(?P<unit>minutes?|hours?)",
    re.IGNORECASE,
)


def parse_wait_minutes(wait_text: str) -> int | None:
    """Convert only HA's known English wait formats to a sortable estimate."""
    match = _WAIT_TEXT_PATTERN.fullmatch(wait_text.strip())
    if match is None:
        return None

    try:
        value = Decimal(match.group("value"))
    except InvalidOperation:
        return None
    minutes = value * 60 if match.group("unit").lower().startswith("hour") else value
    if minutes != minutes.to_integral_value():
        return None
    return int(minutes)


def _hospital_slug(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")
    if not slug:
        raise ValueError("Hospital name cannot be converted to a stable slug")
    return slug


def _text(record: dict[str, object], field: str) -> str:
    value = record.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Missing or invalid {field!r} in HA payload")
    return value


def _records(payload: JsonPayload) -> list[dict[str, object]]:
    value = payload.get("waitTime")
    if not isinstance(value, list) or not all(isinstance(record, dict) for record in value):
        raise ValueError("HA payload has no valid waitTime list")
    return cast(list[dict[str, object]], value)


def _parse_source_updated_at(value: object) -> datetime:
    if not isinstance(value, str):
        raise ValueError("HA payload has no valid updateTime")
    normalized = re.sub(r"\s+(AM|PM)$", r"\1", value.strip(), flags=re.IGNORECASE)
    try:
        parsed = datetime.strptime(normalized, "%d/%m/%Y %I:%M%p")
    except ValueError as error:
        raise ValueError(f"Unsupported HA updateTime: {value!r}") from error
    return parsed.replace(tzinfo=HONG_KONG_TIMEZONE)


def normalize_payloads(
    english_payload: JsonPayload,
    chinese_payload: JsonPayload,
    *,
    fetched_at: datetime,
) -> AeWaitTimesResponse:
    chinese_by_name = {record.get("hospName"): record for record in _records(chinese_payload)}
    hospitals: list[AeHospitalWaitTime] = []

    for english in _records(english_payload):
        english_name = _text(english, "hospName")
        # t45p95: time within which 95% of non-urgent (triage IV/V) patients are seen,
        # a near worst case. Older payloads used topWait.
        wait_field = "t45p95" if "t45p95" in english else "topWait"
        english_wait = _text(english, wait_field)
        chinese_name = HOSPITAL_NAMES_ZH_HANT.get(english_name)
        chinese = chinese_by_name.get(chinese_name) if chinese_name else None
        chinese_wait = _text(chinese, wait_field) if chinese else None
        hospitals.append(
            AeHospitalWaitTime(
                hospital_id=_hospital_slug(english_name),
                name=LocalizedText(en=english_name, zh_hant=chinese_name if chinese else None),
                wait_time_text=LocalizedText(en=english_wait, zh_hant=chinese_wait),
                wait_minutes=parse_wait_minutes(english_wait),
                district=None,
            )
        )

    return AeWaitTimesResponse(
        hospitals=hospitals,
        source_updated_at=_parse_source_updated_at(english_payload.get("updateTime")),
        fetched_at=fetched_at,
        stale=False,
    )


def _fetch_json(url: str) -> JsonPayload:
    with urlopen(url, timeout=HTTP_TIMEOUT_SECONDS) as response:  # noqa: S310
        payload = json.load(response)
    if not isinstance(payload, dict):
        raise ValueError("HA response must be a JSON object")
    return cast(JsonPayload, payload)


def _hong_kong_now() -> datetime:
    return datetime.now(HONG_KONG_TIMEZONE)


class LiveAeWaitTimesSource:
    def __init__(self, fetch_json: FetchJson = _fetch_json, clock: Clock = _hong_kong_now) -> None:
        self._fetch_json = fetch_json
        self._clock = clock
        self._cache: AeWaitTimesResponse | None = None
        self._last_failure_at: datetime | None = None
        self._refresh_lock = asyncio.Lock()

    def _cache_is_fresh(self, now: datetime) -> bool:
        if self._cache is None:
            return False
        age = now - self._cache.fetched_at
        return timedelta(0) <= age < CACHE_TTL

    def _failed_recently(self, now: datetime) -> bool:
        last = self._last_failure_at
        return last is not None and now - last < RETRY_AFTER_FAILURE

    def _stale_or_unavailable(self, now: datetime) -> AeWaitTimesResponse:
        cached = self._cache
        if cached is None or now - cached.fetched_at > MAX_STALE_AGE:
            raise AeSourceUnavailable("A&E waiting time data is unavailable")
        return cached.model_copy(update={"stale": True}, deep=True)

    def _fetch_payloads(self) -> tuple[JsonPayload, JsonPayload]:
        return self._fetch_json(ENGLISH_URL), self._fetch_json(TRADITIONAL_CHINESE_URL)

    async def get_wait_times(self) -> AeWaitTimesResponse:
        now = self._clock()
        cached = self._cache
        if cached is not None and self._cache_is_fresh(now):
            return cached.model_copy(deep=True)

        async with self._refresh_lock:
            now = self._clock()
            cached = self._cache
            if cached is not None and self._cache_is_fresh(now):
                return cached.model_copy(deep=True)
            if self._failed_recently(now):
                return self._stale_or_unavailable(now)

            try:
                english_payload, chinese_payload = await run_in_threadpool(self._fetch_payloads)
                refreshed = normalize_payloads(
                    english_payload,
                    chinese_payload,
                    fetched_at=self._clock(),
                )
            except Exception as error:
                self._last_failure_at = self._clock()
                try:
                    return self._stale_or_unavailable(self._last_failure_at)
                except AeSourceUnavailable as unavailable:
                    raise unavailable from error

            self._cache = refreshed
            self._last_failure_at = None
            return refreshed.model_copy(deep=True)
