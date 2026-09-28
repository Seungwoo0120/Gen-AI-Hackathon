"""LLM prompts and extraction pipeline. The LLM never produces diagnoses or warnings."""

import logging
from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.config import Settings, get_settings
from app.llm.base import Extractor
from app.llm.mock import MockExtractor

logger = logging.getLogger(__name__)


@lru_cache
def _claude_extractor(api_key: str, model: str) -> Extractor:
    from anthropic import AsyncAnthropic

    from app.llm.claude import ClaudeExtractor

    return ClaudeExtractor(AsyncAnthropic(api_key=api_key, timeout=20, max_retries=1), model)


def get_extractor(settings: Annotated[Settings, Depends(get_settings)]) -> Extractor:
    if settings.data_source == "live":
        if settings.llm_api_key:
            return _claude_extractor(settings.llm_api_key, settings.llm_model)
        logger.warning("DATA_SOURCE=live but LLM_API_KEY is empty; using the mock extractor")
    return MockExtractor()
