from typing import Annotated

from fastapi import Depends

from app.adapters.ae.base import AeWaitTimesSource
from app.adapters.ae.live import LiveAeWaitTimesSource
from app.adapters.ae.mock import MockAeWaitTimesSource
from app.config import Settings, get_settings

_mock_source = MockAeWaitTimesSource()
_live_source = LiveAeWaitTimesSource()


def get_ae_source(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AeWaitTimesSource:
    if settings.data_source == "mock":
        return _mock_source
    return _live_source
