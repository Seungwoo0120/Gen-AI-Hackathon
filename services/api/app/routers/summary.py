from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import Field
from sqlalchemy.orm import Session

from app.db import get_session
from app.interactions import check_interactions
from app.interactions.schemas import InteractionWarning
from app.records import list_medications, list_symptoms
from app.records.models import now_hong_kong
from app.records.schemas import MedicationResponse, SymptomResponse
from app.schemas import ApiModel

router = APIRouter()


class DoctorSummary(ApiModel):
    generated_at: datetime
    # "from" is a Python keyword, so the field needs an explicit JSON name.
    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None
    symptoms: list[SymptomResponse]
    medications: list[MedicationResponse]
    interaction_warnings: list[InteractionWarning]


@router.get("/summary", tags=["logging"])
def get_doctor_summary(
    session: Annotated[Session, Depends(get_session)],
    from_time: Annotated[datetime | None, Query(alias="from")] = None,
    to_time: Annotated[datetime | None, Query(alias="to")] = None,
) -> DoctorSummary:
    # The user's own records only: no interpretation. Warnings come from the
    # curated dataset, for all current medications regardless of the date range.
    medications = list_medications(session)
    names = [medication.name for medication in medications]
    warnings = check_interactions(names).warnings if names else []
    return DoctorSummary(
        generated_at=now_hong_kong(),
        from_=from_time,
        to=to_time,
        symptoms=[
            SymptomResponse.model_validate(e) for e in list_symptoms(session, from_time, to_time)
        ],
        medications=[MedicationResponse.model_validate(m) for m in medications],
        interaction_warnings=warnings,
    )
