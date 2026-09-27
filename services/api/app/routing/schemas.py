from pydantic import Field

from app.routing.engine import CareLevel
from app.schemas import ApiModel


class RoutingRequest(ApiModel):
    text: str = Field(min_length=1, max_length=2000)
    age_years: int | None = Field(default=None, ge=0, le=130)
    # Accepted for the contract; matching checks every language regardless.
    lang: str | None = Field(default=None, pattern="^(en|zh-Hant)$")


class RoutingResult(ApiModel):
    care_level: CareLevel
    emergency: bool
    reason_codes: list[str]
    rule_set_version: str


class EmergencyCheck(ApiModel):
    """Shared with /extract: the emergency part of an assessment."""

    emergency: bool
    reason_codes: list[str]
