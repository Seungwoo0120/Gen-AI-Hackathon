"""Chat extraction with the OpenAI Responses API (structured output).

Same prompt, schema and guards as the Claude extractor (see prompting.py).
"""

from typing import Protocol

from pydantic import ValidationError

from app.llm.base import Drafts, ExtractionFailed
from app.llm.prompting import (
    ExtractionRequest,
    LlmExtraction,
    chat_request,
    message_request,
    to_drafts,
)
from app.llm.schemas import ChatTurn


def _strict(schema: object) -> object:
    """OpenAI strict mode needs every object to forbid extra keys, including in $defs."""
    if isinstance(schema, dict):
        if schema.get("type") == "object":
            schema = {**schema, "additionalProperties": False}
        return {key: _strict(value) for key, value in schema.items()}
    if isinstance(schema, list):
        return [_strict(item) for item in schema]
    return schema


OUTPUT_FORMAT = {
    "type": "json_schema",
    "name": "health_log_drafts",
    "schema": _strict(LlmExtraction.model_json_schema()),
    "strict": True,
}


class _ResponsesApi(Protocol):
    async def create(self, **kwargs: object) -> object: ...


class _OpenAILike(Protocol):
    @property
    def responses(self) -> _ResponsesApi: ...


def _parse_output(response: object) -> LlmExtraction | None:
    # Some models occasionally add an extra message item next to the JSON one, so
    # SDK helpers that expect a single JSON text fail. Take the first valid item.
    for item in getattr(response, "output", None) or []:
        if getattr(item, "type", None) != "message":
            continue
        for part in getattr(item, "content", None) or []:
            if getattr(part, "type", None) != "output_text":
                continue
            try:
                return LlmExtraction.model_validate_json(getattr(part, "text", ""))
            except ValidationError:
                continue
    return None


class OpenAIExtractor:
    def __init__(self, client: _OpenAILike, model: str) -> None:
        self._client = client
        self._model = model

    async def extract(self, text: str, lang: str | None) -> Drafts:
        return await self._run(message_request(text, lang))

    async def extract_chat(self, turns: list[ChatTurn], lang: str | None) -> Drafts:
        return await self._run(chat_request(turns, lang))

    async def _run(self, request: ExtractionRequest) -> Drafts:
        try:
            response = await self._client.responses.create(
                model=self._model,
                instructions=request.system,
                input=request.prompt,
                max_output_tokens=4096,
                text={"format": OUTPUT_FORMAT},
                # Health data: do not keep the request on OpenAI's side for later retrieval.
                store=False,
            )
        except Exception as error:  # Any SDK or network failure means no drafts.
            # Log the error type only: the message text is health data.
            raise ExtractionFailed(type(error).__name__) from error
        parsed = _parse_output(response)
        if parsed is None:
            raise ExtractionFailed("no structured output")
        return to_drafts(parsed, request.user_text)
