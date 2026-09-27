from dataclasses import dataclass, field
from typing import Protocol

from app.llm.schemas import MedicationDraft, SymptomDraft


@dataclass
class Drafts:
    symptoms: list[SymptomDraft] = field(default_factory=list)
    medications: list[MedicationDraft] = field(default_factory=list)


class ExtractionFailed(Exception):
    """The extractor could not produce drafts (e.g. LLM unavailable)."""


class Extractor(Protocol):
    async def extract(self, text: str, lang: str | None) -> Drafts: ...
