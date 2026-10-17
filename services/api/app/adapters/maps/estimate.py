"""Approximate travel time when there is no Google Maps key.

The user's location is looked up on OpenStreetMap (Nominatim, free, no key) and the
travel time is estimated from the distance to each A&E hospital. It is a rough
estimate, not a route: good enough to stop recommending a hospital on the other side
of Hong Kong, and the screen calls it approximate.
"""

import json
import math
import threading
import time
import urllib.parse
import urllib.request
from collections.abc import Callable

from tools.google_maps_api import TravelMode, TravelTimeUnavailable

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Nominatim's usage policy asks for an identifying User-Agent and at most 1 request
# a second; each triage request looks up the user's location once (then cached).
USER_AGENT = "hk-health-companion/0.1 (HKU GenAI hackathon prototype)"
# OpenStreetMap files Hong Kong under China, so search inside a box around Hong Kong
# instead of filtering by country code.
HK_VIEWBOX = "113.82,22.57,114.45,22.15"
HTTP_TIMEOUT_SECONDS = 8

# HA A&E hospitals, by their English name in the HA feed. Coordinates from
# OpenStreetMap (Nominatim), looked up 2026-10-17.
HOSPITAL_COORDINATES: dict[str, tuple[float, float]] = {
    "Alice Ho Miu Ling Nethersole Hospital": (22.45852, 114.17491),
    "Caritas Medical Centre": (22.34156, 114.15340),
    "Kwong Wah Hospital": (22.31513, 114.17208),
    "North District Hospital": (22.49671, 114.12420),
    "North Lantau Hospital": (22.28230, 113.93928),
    "Pamela Youde Nethersole Eastern Hospital": (22.27022, 114.23677),
    "Pok Oi Hospital": (22.44541, 114.04157),
    "Prince of Wales Hospital": (22.37961, 114.20219),
    "Princess Margaret Hospital": (22.34124, 114.13458),
    "Queen Elizabeth Hospital": (22.30903, 114.17435),
    "Queen Mary Hospital": (22.26988, 114.13121),
    "Ruttonjee Hospital": (22.27552, 114.17504),
    "St John Hospital": (22.20808, 114.03136),
    "Tin Shui Wai Hospital": (22.45841, 113.99568),
    "Tseung Kwan O Hospital": (22.31828, 114.26966),
    "Tuen Mun Hospital": (22.40754, 113.97583),
    "United Christian Hospital": (22.32250, 114.22738),
    "Yan Chai Hospital": (22.36975, 114.11942),
}

# St John Hospital is on Cheung Chau and is reached by ferry. It serves people on the
# island; sending someone from elsewhere on a ferry to A&E is not a realistic route.
ISLAND_HOSPITALS = {"St John Hospital"}
SAME_ISLAND_KM = 3.0

# Roads are not straight lines; and a rough door-to-door speed for each mode.
DETOUR_FACTOR = 1.3
MINUTES = {
    # mode: (fixed minutes to get going, minutes per road km)
    "transit": (10.0, 2.0),
    "driving": (5.0, 1.5),
}

Coordinates = tuple[float, float]


def _fetch_json(url: str) -> object:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:  # noqa: S310
        return json.load(response)


def _search(place: str, fetch_json: Callable[[str], object]) -> Coordinates | None:
    params = {"q": place, "viewbox": HK_VIEWBOX, "bounded": 1, "format": "jsonv2", "limit": 1}
    results = fetch_json(f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}")
    if not isinstance(results, list) or not results:
        return None
    return float(results[0]["lat"]), float(results[0]["lon"])


def geocode(place: str, fetch_json: Callable[[str], object] = _fetch_json) -> Coordinates:
    """Coordinates of a place in Hong Kong. Raises TravelTimeUnavailable if not found."""
    # "Kennedy Town MTR" is how people say it; OpenStreetMap knows "... Station".
    attempts = [place]
    if "mtr" in place.lower():
        attempts.append(place.lower().replace("mtr", "station"))
    try:
        for attempt in attempts:
            found = _search(attempt, fetch_json)
            if found:
                return found
    except Exception as error:
        raise TravelTimeUnavailable("Location lookup failed") from error
    raise TravelTimeUnavailable("Location not found")


# The agent asks for all hospitals at once: one lookup per location, the rest wait for
# it. Misses are remembered briefly too, so a bad location is not looked up 18 times.
_lock = threading.Lock()
_found: dict[str, Coordinates] = {}
_missed: dict[str, float] = {}
MISS_SECONDS = 600
MAX_CACHED = 256


def _cached_geocode(place: str) -> Coordinates:
    key = place.strip().lower()
    with _lock:
        if key in _found:
            return _found[key]
        if time.monotonic() - _missed.get(key, -MISS_SECONDS) < MISS_SECONDS:
            raise TravelTimeUnavailable("Location not found")
        if len(_found) >= MAX_CACHED:
            _found.clear()
        try:
            _found[key] = geocode(place.strip())
        except TravelTimeUnavailable:
            _missed[key] = time.monotonic()
            raise
        return _found[key]


def distance_km(a: Coordinates, b: Coordinates) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * 6371 * math.asin(math.sqrt(h))


def estimate_minutes(origin: Coordinates, destination: str, mode: TravelMode) -> int:
    if destination not in HOSPITAL_COORDINATES:
        raise TravelTimeUnavailable("Unknown hospital")
    straight_km = distance_km(origin, HOSPITAL_COORDINATES[destination])
    if destination in ISLAND_HOSPITALS and straight_km > SAME_ISLAND_KM:
        raise TravelTimeUnavailable("Island hospital, reached by ferry")
    fixed, per_km = MINUTES[mode]
    return round(fixed + per_km * straight_km * DETOUR_FACTOR)


def estimate_travel_time(origin: str, destination: str, mode: TravelMode) -> int:
    """Same signature as the Google Maps tool, so the agents can use either."""
    return estimate_minutes(_cached_geocode(origin), destination, mode)
