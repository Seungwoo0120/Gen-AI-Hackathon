from datetime import datetime
from typing import Protocol

from app.schemas import ApiModel


class LocalizedText(ApiModel):
    en: str
    zh_hant: str | None = None


class AeHospitalWaitTime(ApiModel):
    hospital_id: str
    name: LocalizedText
    wait_time_text: LocalizedText
    wait_minutes: int | None = None
    district: str | None = None


class AeWaitTimesResponse(ApiModel):
    hospitals: list[AeHospitalWaitTime]
    source_updated_at: datetime
    fetched_at: datetime
    stale: bool


class AeSourceUnavailable(RuntimeError):
    """Raised when the live source fails before any data has been cached."""


class AeWaitTimesSource(Protocol):
    async def get_wait_times(self) -> AeWaitTimesResponse:
        """Return normalized A&E waiting times."""
