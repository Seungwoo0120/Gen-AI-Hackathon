from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.records import (
    create_medication,
    delete_medication,
    list_medications,
    update_medication,
)
from app.records.models import Medication
from app.records.schemas import ErrorResponse, MedicationInput, MedicationResponse

router = APIRouter()


def _response(medication: Medication) -> MedicationResponse:
    return MedicationResponse.model_validate(medication)


@router.get("/medications", tags=["medications"])
def get_medications(
    session: Annotated[Session, Depends(get_session)],
) -> list[MedicationResponse]:
    return [_response(medication) for medication in list_medications(session)]


@router.post("/medications", tags=["medications"], status_code=status.HTTP_201_CREATED)
def post_medication(
    request: MedicationInput,
    session: Annotated[Session, Depends(get_session)],
) -> MedicationResponse:
    return _response(create_medication(session, request))


@router.put(
    "/medications/{medicationId}",
    tags=["medications"],
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
def put_medication(
    medication_id: Annotated[str, Path(alias="medicationId")],
    request: MedicationInput,
    session: Annotated[Session, Depends(get_session)],
) -> MedicationResponse:
    medication = update_medication(session, medication_id, request)
    if medication is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    return _response(medication)


@router.delete(
    "/medications/{medicationId}",
    tags=["medications"],
    status_code=status.HTTP_204_NO_CONTENT,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
def remove_medication(
    medication_id: Annotated[str, Path(alias="medicationId")],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    if not delete_medication(session, medication_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
