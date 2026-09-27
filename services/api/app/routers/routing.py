from fastapi import APIRouter

from app.routing import assess
from app.routing.schemas import RoutingRequest, RoutingResult

router = APIRouter()


@router.post("/routing/assess", tags=["care"])
def assess_care_routing(request: RoutingRequest) -> RoutingResult:
    result = assess(request.text, request.age_years)
    return RoutingResult(
        care_level=result.care_level,
        emergency=result.emergency,
        reason_codes=result.reason_codes,
        rule_set_version=result.rule_set_version,
    )
