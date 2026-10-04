from dataclasses import dataclass, field
from typing import Protocol

from app.llm.schemas import ChatTurn, MedicationDraft, SymptomDraft


@dataclass
class Drafts:
    symptoms: list[SymptomDraft] = field(default_factory=list)
    medications: list[MedicationDraft] = field(default_factory=list)


class ExtractionFailed(Exception):
    """The extractor could not produce drafts (e.g. LLM unavailable)."""


class Extractor(Protocol):
    async def extract(self, text: str, lang: str | None) -> Drafts: ...

    async def extract_chat(self, turns: list[ChatTurn], lang: str | None) -> Drafts:
        """Drafts from the whole conversation so far, each answer read with its question."""
        ...


def answers_text(turns: list[ChatTurn]) -> str:
    """Only the user's words: what the guards check drafts against."""
    return "\n".join(turn.answer for turn in turns)
