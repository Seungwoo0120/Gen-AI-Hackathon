"""Deterministic keyword extractor used offline and in tests. Not meant to be clever."""

import re

from app.llm.base import Drafts, answers_text
from app.llm.schemas import ChatTurn, MedicationDraft, SymptomDraft

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

    async def extract_chat(self, turns: list[ChatTurn], lang: str | None) -> Drafts:
        drafts = await self.extract(answers_text(turns), lang)
        # Enough to walk through the whole flow offline: a lone 1-5 digit answering
        # the severity question becomes the severity of every symptom.
        for turn in turns:
            rating = re.fullmatch(r"\D*([1-5])\D*", turn.answer)
            if turn.question == "ask_severity" and rating:
                for symptom in drafts.symptoms:
                    symptom.severity = int(rating.group(1))
        return drafts
