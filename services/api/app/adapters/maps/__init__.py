"""Travel time from the user's location to a hospital (Google Maps Distance Matrix).

The live client is the standalone tool in tools/google_maps_api.py at the repo
root, so it also runs as a bare script with no backend.
"""

import sys
from collections.abc import Callable
from pathlib import Path
from typing import Annotated

from fastapi import Depends

from app.config import Settings, get_settings

# ponytail: sys.path hack to reach tools/ at the repo root; move google_maps_api.py
# to app/adapters/maps/live.py once it no longer needs to run standalone.
_REPO_ROOT = Path(__file__).resolve().parents[5]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from tools.google_maps_api import (  # noqa: E402
    TravelMode,
    TravelTimeUnavailable,
    calculate_travel_time,
    has_api_key,
)

from app.adapters.maps.estimate import estimate_travel_time  # noqa: E402
from app.adapters.maps.mock import mock_travel_time  # noqa: E402

__all__ = ["TravelMode", "TravelTimeFn", "TravelTimeUnavailable", "get_travel_time"]

# (origin, destination hospital name, mode) -> whole minutes; raises TravelTimeUnavailable.
TravelTimeFn = Callable[[str, str, TravelMode], int]


def get_travel_time(settings: Annotated[Settings, Depends(get_settings)]) -> TravelTimeFn:
    if settings.data_source == "mock":
        return mock_travel_time
    # Google Maps needs a billing account; without a key, estimate from distance.
    return calculate_travel_time if has_api_key() else estimate_travel_time
