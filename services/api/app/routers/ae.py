from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.adapters.ae import get_ae_source
from app.adapters.ae.base import AeSourceUnavailable, AeWaitTimesResponse, AeWaitTimesSource

router = APIRouter()


@router.get("/ae/wait-times", response_model=AeWaitTimesResponse)
async def list_ae_wait_times(
    source: Annotated[AeWaitTimesSource, Depends(get_ae_source)],
) -> AeWaitTimesResponse:
    try:
        response = await source.get_wait_times()
    except AeSourceUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    hospitals = sorted(
        response.hospitals,
        key=lambda hospital: (
            hospital.wait_minutes is None,
            hospital.wait_minutes if hospital.wait_minutes is not None else 0,
        ),
    )
    return response.model_copy(update={"hospitals": hospitals})
