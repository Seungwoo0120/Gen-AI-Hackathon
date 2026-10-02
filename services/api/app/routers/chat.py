import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.chat.questions import next_question
from app.llm import get_extractor
from app.llm.base import Drafts, ExtractionFailed, Extractor, answers_text
from app.llm.schemas import ChatRequest, ChatResult
from app.routing import check_emergency

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", tags=["logging"])
async def chat(
    request: ChatRequest,
    extractor: Annotated[Extractor, Depends(get_extractor)],
) -> ChatResult:
    # Every answer so far, every turn: an emergency mentioned early is never lost.
    emergency = check_emergency(answers_text(request.turns))
    try:
        drafts = await extractor.extract_chat(request.turns, request.lang)
    except ExtractionFailed as error:
        logger.warning("Chat extraction failed: %s", error)
        drafts = Drafts()
    return ChatResult(
        next_question=next_question(request.turns, drafts, emergency.emergency),
        symptoms=drafts.symptoms,
        medications=drafts.medications,
        emergency=emergency,
    )
