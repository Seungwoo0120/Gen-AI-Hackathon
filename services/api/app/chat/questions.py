"""Pick the next follow-up question from what is still missing.

Each question is asked at most once, so a conversation has at most four
questions. The app only gathers facts for the user's own log: it never asks
anything meant to narrow down a cause.
"""

from app.llm.base import Drafts
from app.llm.schemas import MAX_CHAT_TURNS, ChatQuestion, ChatTurn


def next_question(turns: list[ChatTurn], drafts: Drafts, emergency: bool) -> ChatQuestion | None:
    # An emergency ends the conversation: the screen shows "Call 999" instead.
    if emergency or len(turns) >= MAX_CHAT_TURNS:
        return None
    asked = {turn.question for turn in turns}
    missing: list[ChatQuestion] = []
    if not drafts.symptoms and not drafts.medications:
        missing.append("ask_symptoms")
    if drafts.symptoms:
        if any(symptom.started_at is None for symptom in drafts.symptoms):
            missing.append("ask_onset")
        if any(symptom.severity is None for symptom in drafts.symptoms):
            missing.append("ask_severity")
        if not drafts.medications:
            missing.append("ask_medications")
    return next((question for question in missing if question not in asked), None)
