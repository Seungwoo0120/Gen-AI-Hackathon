from typing import Annotated

from pydantic import Field, StringConstraints

from app.routing.schemas import EmergencyCheck
from app.schemas import ApiModel

# Drafts mirror SymptomInput / MedicationInput in openapi.yaml.

HHMM = "^([01][0-9]|2[0-3]):[0-5][0-9]$"


class SymptomDraft(ApiModel):
    name: str = Field(min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)
    severity: int | None = Field(default=None, ge=1, le=5)
    started_at: str | None = None
    recorded_at: str | None = None


class MedicationScheduleDraft(ApiModel):
    times: list[Annotated[str, StringConstraints(pattern=HHMM)]]
    days_of_week: list[Annotated[int, Field(ge=1, le=7)]] | None = None


class MedicationDraft(ApiModel):
    name: str = Field(min_length=1, max_length=200)
    dose: str | None = Field(default=None, max_length=100)
    schedule: MedicationScheduleDraft | None = None
    notes: str | None = Field(default=None, max_length=1000)


class ExtractRequest(ApiModel):
    text: str = Field(min_length=1, max_length=4000)
    lang: str | None = Field(default=None, pattern="^(en|zh-Hant)$")


class ExtractResult(ApiModel):
    symptoms: list[SymptomDraft]
    medications: list[MedicationDraft]
    emergency: EmergencyCheck
