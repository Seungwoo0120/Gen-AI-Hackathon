from datetime import datetime
from typing import Annotated, Literal

from pydantic import ConfigDict, Field, StringConstraints

from app.schemas import ApiModel

NonBlankName = Annotated[
    str,
    StringConstraints(min_length=1, max_length=200, pattern=r"\S"),
]
ScheduleTime = Annotated[
    str,
    StringConstraints(pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$"),
]
DayOfWeek = Annotated[int, Field(ge=1, le=7)]
SymptomSource = Literal["chat", "manual"]


class SymptomInput(ApiModel):
    name: NonBlankName
    details: str | None = Field(default=None, max_length=2000)
    severity: int | None = Field(default=None, ge=1, le=5)
    started_at: datetime | None = None
    recorded_at: datetime | None = None
    source: SymptomSource = "manual"


class SymptomResponse(SymptomInput):
    model_config = ConfigDict(from_attributes=True)

    id: str
    recorded_at: datetime
    source: SymptomSource


class MedicationSchedule(ApiModel):
    times: list[ScheduleTime]
    days_of_week: list[DayOfWeek] | None = None


class MedicationInput(ApiModel):
    name: NonBlankName
    dose: str | None = Field(default=None, max_length=100)
    schedule: MedicationSchedule | None = None
    notes: str | None = Field(default=None, max_length=1000)


class MedicationResponse(MedicationInput):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


class ErrorResponse(ApiModel):
    detail: str
