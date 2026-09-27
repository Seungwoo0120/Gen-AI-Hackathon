import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.llm import get_extractor
from app.llm.base import Drafts, ExtractionFailed, Extractor
from app.llm.schemas import ExtractRequest, ExtractResult
from app.routing import check_emergency

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/extract", tags=["logging"])
async def extract_from_message(
    request: ExtractRequest,
    extractor: Annotated[Extractor, Depends(get_extractor)],
) -> ExtractResult:
    # Rule-based and independent of the LLM, so it still works when the LLM fails.
    emergency = check_emergency(request.text)
    try:
        drafts = await extractor.extract(request.text, request.lang)
    except ExtractionFailed as error:
        logger.warning("Extraction failed: %s", error)
        drafts = Drafts()
    return ExtractResult(
        symptoms=drafts.symptoms, medications=drafts.medications, emergency=emergency
    )
