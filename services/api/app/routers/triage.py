import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.llm.schemas import TriageRequest, TriageResult
from app.llm.triage import TriageAgent, TriageAgentError, get_triage_agent
from app.routing import check_emergency

logger = logging.getLogger(__name__)
router = APIRouter()

EMERGENCY_RECOMMENDATION = (
    "This may be a medical emergency. Call 999 now instead of travelling to a hospital yourself."
)
AGENT_UNAVAILABLE_RECOMMENDATION = (
    "Could not reach the A&E routing assistant right now. Please check A&E wait times "
    "directly, or call 999 if this is urgent."
)


@router.post("/api/v1/triage", tags=["care"])
async def triage_patient(
    request: TriageRequest,
    agent: Annotated[TriageAgent, Depends(get_triage_agent)],
) -> TriageResult:
    # Rule-based and independent of the LLM, so it still applies when the agent fails.
    emergency = check_emergency(request.symptoms)
    if emergency.emergency:
        return TriageResult(recommendation=EMERGENCY_RECOMMENDATION, emergency=emergency)

    try:
        recommendation = await agent.recommend(request.current_location)
    except TriageAgentError as error:
        logger.warning("Triage agent failed: %s", error)
        recommendation = AGENT_UNAVAILABLE_RECOMMENDATION
    return TriageResult(recommendation=recommendation, emergency=emergency)
