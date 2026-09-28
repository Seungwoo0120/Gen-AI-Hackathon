from fastapi import APIRouter

from app.interactions import check_interactions
from app.interactions.schemas import InteractionCheckRequest, InteractionCheckResult

router = APIRouter()


@router.post(
    "/interactions/check",
    tags=["medications"],
    response_model_exclude_none=True,
)
def check_medication_interactions(request: InteractionCheckRequest) -> InteractionCheckResult:
    return check_interactions(request.medications)
