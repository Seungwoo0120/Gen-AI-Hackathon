"""Standalone GenAI-agent tool: travel time via the Google Maps Distance Matrix API.

The A&E adapter (services/api/app/adapters/ae) gives wait times, this gives
travel time; the agent combines both to rank hospitals by "nearby and fast".
The backend reaches it through app/adapters/maps, which swaps in a mock when
DATA_SOURCE=mock. Uses urllib
(stdlib) instead of the googlemaps package: one HTTP call doesn't need a new
dependency.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import Literal

TravelMode = Literal["transit", "driving"]

DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
HTTP_TIMEOUT_SECONDS = 10
ENV_VAR = "GOOGLE_MAPS_API_KEY"
# Same root .env services/api reads via pydantic-settings (tools/ is one level
# down from the repo root).
_ROOT_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class TravelTimeUnavailable(RuntimeError):
    """Raised when Google Maps can't give a real travel time.

    Callers should drop the hospital from ranking, never substitute a guess.
    """


def _load_api_key() -> str:
    key = os.environ.get(ENV_VAR, "")
    if key:
        return key
    if _ROOT_ENV_FILE.exists():
        for line in _ROOT_ENV_FILE.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith(f"{ENV_VAR}="):
                return line.split("=", 1)[1].strip()
    raise TravelTimeUnavailable(f"{ENV_VAR} is not set (checked environment and .env)")


def has_api_key() -> bool:
    try:
        _load_api_key()
    except TravelTimeUnavailable:
        return False
    return True


def _fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=HTTP_TIMEOUT_SECONDS) as response:  # noqa: S310
        return json.load(response)


def calculate_travel_time(
    origin: str,
    destination: str,
    mode: TravelMode,
    *,
    fetch_json: Callable[[str], dict] = _fetch_json,
    api_key: str | None = None,
) -> int:
    """Estimated travel time in whole minutes from origin to destination.

    origin: an address or landmark, e.g. "Central MTR Station".
    destination: a hospital name; ", Hong Kong" is appended to disambiguate it.
    mode: "transit" or "driving".

    Raises TravelTimeUnavailable instead of returning a guessed number.
    """
    if mode not in ("transit", "driving"):
        raise ValueError(f"mode must be 'transit' or 'driving', got {mode!r}")

    params = {
        "origins": origin,
        "destinations": f"{destination}, Hong Kong",
        "mode": mode,
        "key": api_key or _load_api_key(),
    }
    url = f"{DISTANCE_MATRIX_URL}?{urllib.parse.urlencode(params)}"

    try:
        payload = fetch_json(url)
    except Exception as error:
        raise TravelTimeUnavailable(f"Google Maps request failed: {error}") from error

    if payload.get("status") != "OK":
        raise TravelTimeUnavailable(f"Google Maps status: {payload.get('status')}")

    try:
        element = payload["rows"][0]["elements"][0]
    except (IndexError, KeyError) as error:
        raise TravelTimeUnavailable("Google Maps response had no route") from error
    if element.get("status") != "OK":
        raise TravelTimeUnavailable(f"No route found: {element.get('status')}")

    return round(element["duration"]["value"] / 60)


def _demo() -> None:
    good_payload = {
        "status": "OK",
        "rows": [{"elements": [{"status": "OK", "duration": {"value": 1850}}]}],
    }
    minutes = calculate_travel_time(
        "Central MTR Station",
        "Queen Mary Hospital",
        "transit",
        fetch_json=lambda _url: good_payload,
        api_key="test-key",
    )
    assert minutes == 31  # 1850s = 30.83 min, rounds to 31

    not_found_payload = {"status": "OK", "rows": [{"elements": [{"status": "NOT_FOUND"}]}]}
    try:
        calculate_travel_time(
            "nowhere",
            "Queen Mary Hospital",
            "driving",
            fetch_json=lambda _url: not_found_payload,
            api_key="test-key",
        )
    except TravelTimeUnavailable:
        pass
    else:
        raise AssertionError("expected TravelTimeUnavailable for a status other than OK")

    try:
        calculate_travel_time("A", "B", "flying", api_key="test-key")  # type: ignore[arg-type]
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for an invalid mode")

    print("google_maps_api self-check passed")


if __name__ == "__main__":
    _demo()
