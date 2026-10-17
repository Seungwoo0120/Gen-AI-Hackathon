"""Chat extraction with the Claude API (structured output).

The model only organizes what the user said. Its output is validated and filtered
before anyone sees it, and nothing is saved until the user confirms the drafts.
"""

from typing import Protocol

from app.llm.base import Drafts, ExtractionFailed
from app.llm.prompting import (
    ExtractionRequest,
    LlmExtraction,
    chat_request,
    message_request,
    to_drafts,
)
from app.llm.schemas import ChatTurn


class _ParsedResponse(Protocol):
    @property
    def parsed_output(self) -> LlmExtraction | None: ...


class _MessagesApi(Protocol):
    async def parse(self, **kwargs: object) -> _ParsedResponse: ...


class _AnthropicLike(Protocol):
    @property
    def messages(self) -> _MessagesApi: ...


class ClaudeExtractor:
    def __init__(self, client: _AnthropicLike, model: str) -> None:
        self._client = client
        self._model = model

    async def extract(self, text: str, lang: str | None) -> Drafts:
        return await self._run(message_request(text, lang))

    async def extract_chat(self, turns: list[ChatTurn], lang: str | None) -> Drafts:
        return await self._run(chat_request(turns, lang))

    async def _run(self, request: ExtractionRequest) -> Drafts:
        try:
            response = await self._client.messages.parse(
                model=self._model,
                max_tokens=2048,
                system=request.system,
                messages=[{"role": "user", "content": request.prompt}],
                output_format=LlmExtraction,
            )
        except Exception as error:  # Any SDK or network failure means no drafts.
            # Log the error type only: the message text is health data.
            raise ExtractionFailed(type(error).__name__) from error
        parsed = response.parsed_output
        if parsed is None:
            raise ExtractionFailed("no structured output")
        return to_drafts(parsed, request.user_text)
