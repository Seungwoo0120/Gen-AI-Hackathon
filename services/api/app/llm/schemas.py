from typing import Annotated, Literal

from pydantic import Field, StringConstraints, model_validator

from app.routing.schemas import EmergencyCheck
from app.schemas import ApiModel

# Drafts mirror SymptomInput / MedicationInput in openapi.yaml.

HHMM = "^([01][0-9]|2[0-3]):[0-5][0-9]$"


class SymptomDraft(ApiModel):
    name: str = Field(min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)
    severity: int | None = Field(default=None, ge=1, le=5)
    started_at: str | None = None
    recorded_at: str | None = None


class MedicationScheduleDraft(ApiModel):
    times: list[Annotated[str, StringConstraints(pattern=HHMM)]]
    days_of_week: list[Annotated[int, Field(ge=1, le=7)]] | None = None


class MedicationDraft(ApiModel):
    name: str = Field(min_length=1, max_length=200)
    dose: str | None = Field(default=None, max_length=100)
    schedule: MedicationScheduleDraft | None = None
    notes: str | None = Field(default=None, max_length=1000)


class ExtractRequest(ApiModel):
    text: str = Field(min_length=1, max_length=4000)
    lang: str | None = Field(default=None, pattern="^(en|zh-Hant)$")


class ExtractResult(ApiModel):
    symptoms: list[SymptomDraft]
    medications: list[MedicationDraft]
    emergency: EmergencyCheck


# --- /chat ---

# Follow-up questions are fixed codes chosen by rules, never text written by the LLM.
# The frontend translates them. Order here is the order they are asked in.
ChatQuestion = Literal["ask_symptoms", "ask_onset", "ask_severity", "ask_medications"]

MAX_CHAT_TURNS = 8
MAX_CHAT_CHARS = 4000


class ChatTurn(ApiModel):
    question: ChatQuestion | None = None
    answer: str = Field(min_length=1, max_length=1000, pattern=r"\S")


class ChatRequest(ApiModel):
    turns: list[ChatTurn] = Field(min_length=1, max_length=MAX_CHAT_TURNS)
    lang: str | None = Field(default=None, pattern="^(en|zh-Hant)$")

    @model_validator(mode="after")
    def _limit_total_length(self) -> "ChatRequest":
        if sum(len(turn.answer) for turn in self.turns) > MAX_CHAT_CHARS:
            raise ValueError(f"answers exceed {MAX_CHAT_CHARS} characters in total")
        return self


class ChatResult(ApiModel):
    next_question: ChatQuestion | None
    symptoms: list[SymptomDraft]
    medications: list[MedicationDraft]
    emergency: EmergencyCheck
