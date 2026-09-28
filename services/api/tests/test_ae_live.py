import json
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app.adapters.ae.base import AeSourceUnavailable
from app.adapters.ae.live import (
    ENGLISH_URL,
    HONG_KONG_TIMEZONE,
    LiveAeWaitTimesSource,
    normalize_payloads,
    parse_wait_minutes,
)

FIXTURE_DIR = Path(__file__).parent / "fixtures" / "ae"


def _fixture(name: str) -> dict[str, object]:
    return json.loads((FIXTURE_DIR / name).read_text())


@pytest.mark.parametrize(
    ("wait_text", "expected"),
    [
        ("Around 2 hours", 120),
        ("Over 3 hours", 180),
        ("Within 15 minutes", 15),
        ("less than 15 minutes", 15),
        ("1.5 hours", 90),
        ("60 minutes", 60),
        ("0 hour", 0),
        ("Managing multiple resuscitation cases", None),
        ("Waiting time temporarily unavailable", None),
        ("about two hours", None),
    ],
)
def test_parse_wait_minutes(wait_text, expected) -> None:
    assert parse_wait_minutes(wait_text) == expected


def test_saved_live_fixtures_normalize_both_languages() -> None:
    fetched_at = datetime(2026, 9, 27, 23, 5, tzinfo=HONG_KONG_TIMEZONE)
    response = normalize_payloads(
        _fixture("wait-times-en.json"),
        _fixture("wait-times-tc.json"),
        fetched_at=fetched_at,
    )

    assert len(response.hospitals) == 18
    queen_mary = next(
        hospital for hospital in response.hospitals if hospital.hospital_id == "queen-mary-hospital"
    )
    assert queen_mary.name.en == "Queen Mary Hospital"
    assert queen_mary.name.zh_hant == "瑪麗醫院"
    assert queen_mary.wait_time_text.en == "6 hours"
    assert queen_mary.wait_time_text.zh_hant == "6 小時"
    assert queen_mary.wait_minutes == 360
    assert queen_mary.district is None
    assert response.source_updated_at.isoformat() == "2026-09-27T23:00:00+08:00"
    assert response.fetched_at == fetched_at
    assert response.stale is False


class _FakeClock:
    def __init__(self) -> None:
        self.now = datetime(2026, 9, 27, 23, 5, tzinfo=HONG_KONG_TIMEZONE)

    def __call__(self) -> datetime:
        return self.now

    def advance(self, delta: timedelta) -> None:
        self.now += delta


class _FakeFetcher:
    def __init__(self) -> None:
        self.calls = 0
        self.fail = False

    def __call__(self, url: str) -> dict[str, object]:
        self.calls += 1
        if self.fail:
            raise OSError("source unavailable")
        filename = "wait-times-en.json" if url == ENGLISH_URL else "wait-times-tc.json"
        return _fixture(filename)


@pytest.mark.anyio
async def test_live_source_caches_for_fifteen_minutes() -> None:
    clock = _FakeClock()
    fetcher = _FakeFetcher()
    source = LiveAeWaitTimesSource(fetch_json=fetcher, clock=clock)

    first = await source.get_wait_times()
    clock.advance(timedelta(minutes=14, seconds=59))
    second = await source.get_wait_times()

    assert fetcher.calls == 2
    assert second == first


@pytest.mark.anyio
async def test_live_source_returns_stale_cache_after_refresh_failure() -> None:
    clock = _FakeClock()
    fetcher = _FakeFetcher()
    source = LiveAeWaitTimesSource(fetch_json=fetcher, clock=clock)

    fresh = await source.get_wait_times()
    clock.advance(timedelta(minutes=15))
    fetcher.fail = True
    stale = await source.get_wait_times()

    assert stale.stale is True
    assert stale.fetched_at == fresh.fetched_at
    assert stale.hospitals == fresh.hospitals


@pytest.mark.anyio
async def test_live_source_raises_when_refresh_fails_without_cache() -> None:
    clock = _FakeClock()
    fetcher = _FakeFetcher()
    fetcher.fail = True
    source = LiveAeWaitTimesSource(fetch_json=fetcher, clock=clock)

    with pytest.raises(AeSourceUnavailable):
        await source.get_wait_times()


# --- joining languages by name ---


def _normalize(english: dict[str, object], chinese: dict[str, object]):
    fetched_at = datetime(2026, 9, 27, 23, 5, tzinfo=HONG_KONG_TIMEZONE)
    return normalize_payloads(english, chinese, fetched_at=fetched_at)


def _by_id(response, hospital_id: str):
    return next(h for h in response.hospitals if h.hospital_id == hospital_id)


def test_languages_are_joined_by_name_not_order() -> None:
    chinese = _fixture("wait-times-tc.json")
    chinese["waitTime"] = list(reversed(chinese["waitTime"]))

    response = _normalize(_fixture("wait-times-en.json"), chinese)

    queen_mary = _by_id(response, "queen-mary-hospital")
    assert queen_mary.name.zh_hant == "瑪麗醫院"
    assert queen_mary.wait_time_text.zh_hant == "6 小時"
    alice_ho = _by_id(response, "alice-ho-miu-ling-nethersole-hospital")
    assert alice_ho.name.zh_hant == "雅麗氏何妙齡那打素醫院"


def test_every_fixture_hospital_has_a_chinese_name() -> None:
    response = _normalize(_fixture("wait-times-en.json"), _fixture("wait-times-tc.json"))
    assert all(h.name.zh_hant and h.wait_time_text.zh_hant for h in response.hospitals)


def test_unknown_or_missing_hospital_keeps_english_only() -> None:
    english = _fixture("wait-times-en.json")
    english["waitTime"][0] = {**english["waitTime"][0], "hospName": "New Test Hospital"}
    chinese = _fixture("wait-times-tc.json")
    chinese["waitTime"] = [r for r in chinese["waitTime"] if r["hospName"] != "瑪麗醫院"]

    response = _normalize(english, chinese)

    assert len(response.hospitals) == 18
    new = _by_id(response, "new-test-hospital")
    assert new.name.zh_hant is None and new.wait_time_text.zh_hant is None
    queen_mary = _by_id(response, "queen-mary-hospital")
    assert queen_mary.name.zh_hant is None and queen_mary.wait_time_text.en == "6 hours"


# --- outage behaviour ---


@pytest.mark.anyio
async def test_failure_backs_off_before_refetching() -> None:
    clock = _FakeClock()
    fetcher = _FakeFetcher()
    source = LiveAeWaitTimesSource(fetch_json=fetcher, clock=clock)
    await source.get_wait_times()
    clock.advance(timedelta(minutes=15))
    fetcher.fail = True
    await source.get_wait_times()
    calls_after_failure = fetcher.calls

    clock.advance(timedelta(seconds=59))
    during_backoff = await source.get_wait_times()
    assert fetcher.calls == calls_after_failure
    assert during_backoff.stale is True

    clock.advance(timedelta(seconds=1))
    fetcher.fail = False
    recovered = await source.get_wait_times()
    assert fetcher.calls > calls_after_failure
    assert recovered.stale is False


@pytest.mark.anyio
async def test_failure_without_cache_backs_off_too() -> None:
    clock = _FakeClock()
    fetcher = _FakeFetcher()
    fetcher.fail = True
    source = LiveAeWaitTimesSource(fetch_json=fetcher, clock=clock)
    with pytest.raises(AeSourceUnavailable):
        await source.get_wait_times()
    calls = fetcher.calls

    with pytest.raises(AeSourceUnavailable):
        await source.get_wait_times()
    assert fetcher.calls == calls


@pytest.mark.anyio
async def test_data_older_than_two_hours_is_not_served() -> None:
    clock = _FakeClock()
    fetcher = _FakeFetcher()
    source = LiveAeWaitTimesSource(fetch_json=fetcher, clock=clock)
    await source.get_wait_times()
    fetcher.fail = True

    clock.advance(timedelta(hours=2))
    assert (await source.get_wait_times()).stale is True

    clock.advance(timedelta(minutes=1, seconds=1))
    with pytest.raises(AeSourceUnavailable):
        await source.get_wait_times()
