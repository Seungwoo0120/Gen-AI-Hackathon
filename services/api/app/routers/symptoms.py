from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.records import create_symptom, delete_symptom, list_symptoms
from app.records.models import SymptomEntry
from app.records.schemas import ErrorResponse, SymptomInput, SymptomResponse

router = APIRouter()


def _response(entry: SymptomEntry) -> SymptomResponse:
    return SymptomResponse.model_validate(entry)


@router.get("/symptoms", tags=["logging"])
def get_symptoms(
    session: Annotated[Session, Depends(get_session)],
    from_time: Annotated[datetime | None, Query(alias="from")] = None,
    to_time: Annotated[datetime | None, Query(alias="to")] = None,
) -> list[SymptomResponse]:
    return [_response(entry) for entry in list_symptoms(session, from_time, to_time)]


@router.post("/symptoms", tags=["logging"], status_code=status.HTTP_201_CREATED)
def post_symptom(
    request: SymptomInput,
    session: Annotated[Session, Depends(get_session)],
) -> SymptomResponse:
    return _response(create_symptom(session, request, source=request.source))


@router.delete(
    "/symptoms/{symptomId}",
    tags=["logging"],
    status_code=status.HTTP_204_NO_CONTENT,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
def remove_symptom(
    symptom_id: Annotated[str, Path(alias="symptomId")],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    if not delete_symptom(session, symptom_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Symptom not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
