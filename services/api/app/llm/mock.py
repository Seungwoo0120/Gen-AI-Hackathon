"""Deterministic keyword extractor used offline and in tests. Not meant to be clever."""

from app.llm.base import Drafts
from app.llm.schemas import MedicationDraft, SymptomDraft

SYMPTOM_WORDS = (
    "headache",
    "fever",
    "cough",
    "dizzy",
    "sore throat",
    "stomach ache",
    "頭痛",
    "發燒",
    "咳",
    "頭暈",
    "喉嚨痛",
    "肚痛",
)
MEDICATION_WORDS = (
    "panadol",
    "paracetamol",
    "ibuprofen",
    "aspirin",
    "metformin",
    "amlodipine",
    "必理痛",
)


def _found(text: str, words: tuple[str, ...]) -> list[str]:
    lowered = text.lower()
    return [word for word in words if word in lowered]


class MockExtractor:
    async def extract(self, text: str, lang: str | None) -> Drafts:
        return Drafts(
            symptoms=[SymptomDraft(name=word) for word in _found(text, SYMPTOM_WORDS)],
            medications=[MedicationDraft(name=word) for word in _found(text, MEDICATION_WORDS)],
        )
