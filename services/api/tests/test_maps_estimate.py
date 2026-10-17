import pytest

from app.adapters.maps import TravelTimeUnavailable
from app.adapters.maps.estimate import (
    HOSPITAL_COORDINATES,
    estimate_minutes,
    geocode,
)

KENNEDY_TOWN = (22.2813, 114.1277)
CHEUNG_CHAU_PIER = (22.2098, 114.0290)


def nominatim(results_by_query: dict[str, list[dict]]):
    queries: list[str] = []

    def fetch(url: str) -> object:
        queries.append(url)
        for text, results in results_by_query.items():
            if f"q={text}" in url:
                return results
        return []

    return fetch, queries


def test_geocode_retries_mtr_as_station() -> None:
    fetch, queries = nominatim({"kennedy+town+station": [{"lat": "22.28", "lon": "114.12"}]})
    assert geocode("Kennedy Town MTR", fetch) == (22.28, 114.12)
    assert len(queries) == 2
    assert "bounded=1" in queries[0]


def test_geocode_not_found_raises() -> None:
    fetch, _ = nominatim({})
    with pytest.raises(TravelTimeUnavailable):
        geocode("Nowhere at all", fetch)


def test_geocode_network_error_raises_travel_time_unavailable() -> None:
    def broken(url: str) -> object:
        raise OSError("offline")

    with pytest.raises(TravelTimeUnavailable):
        geocode("Mong Kok", broken)


def test_nearby_hospital_is_quicker_than_a_far_one() -> None:
    near = estimate_minutes(KENNEDY_TOWN, "Queen Mary Hospital", "transit")
    far = estimate_minutes(KENNEDY_TOWN, "Tuen Mun Hospital", "transit")
    assert 10 <= near < 20
    assert far > near + 30


def test_island_hospital_only_for_people_on_the_island() -> None:
    with pytest.raises(TravelTimeUnavailable):
        estimate_minutes(KENNEDY_TOWN, "St John Hospital", "transit")
    assert estimate_minutes(CHEUNG_CHAU_PIER, "St John Hospital", "transit") < 20


def test_unknown_hospital_raises() -> None:
    with pytest.raises(TravelTimeUnavailable):
        estimate_minutes(KENNEDY_TOWN, "Not A Hospital", "transit")


def test_every_ha_ae_hospital_has_coordinates_in_hong_kong() -> None:
    assert len(HOSPITAL_COORDINATES) == 18
    for lat, lon in HOSPITAL_COORDINATES.values():
        assert 22.15 < lat < 22.57 and 113.82 < lon < 114.45
