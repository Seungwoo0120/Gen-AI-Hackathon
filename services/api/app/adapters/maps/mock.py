from tools.google_maps_api import TravelMode, TravelTimeUnavailable

# Fixed fake travel times to the hospitals in app/adapters/ae/mock.py, so
# DATA_SOURCE=mock never calls Google Maps. Origin and mode are ignored.
MOCK_TRAVEL_MINUTES = {
    "Queen Mary Hospital": 20,
    "Queen Elizabeth Hospital": 30,
    "Caritas Medical Centre": 35,
    "Prince of Wales Hospital": 45,
    "Alice Ho Miu Ling Nethersole Hospital": 55,
}


def mock_travel_time(origin: str, destination: str, mode: TravelMode) -> int:
    if destination not in MOCK_TRAVEL_MINUTES:
        raise TravelTimeUnavailable(f"No mock travel time for {destination}")
    return MOCK_TRAVEL_MINUTES[destination]
