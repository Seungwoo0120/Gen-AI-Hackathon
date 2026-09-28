from typing import Annotated, Literal

from pydantic import AnyUrl, Field, StringConstraints

from app.schemas import ApiModel

# At least one non-space character; the name is kept exactly as the user typed it.
MedicationName = Annotated[str, StringConstraints(min_length=1, pattern=r"\S")]


class InteractionCheckRequest(ApiModel):
    medications: list[MedicationName] = Field(min_length=1, max_length=50)


class LocalizedText(ApiModel):
    en: str
    zh_hant: str | None = None


class SourceReference(ApiModel):
    title: str
    url: AnyUrl | None = None


class InteractionWarning(ApiModel):
    kind: Literal["interaction", "duplicate_ingredient"]
    severity: Literal["major", "moderate", "minor"]
    medications: list[str]
    ingredient: str | None = None
    summary: LocalizedText
    sources: list[SourceReference] = Field(min_length=1)


class InteractionCheckResult(ApiModel):
    warnings: list[InteractionWarning]
    unrecognized: list[str]
    dataset_version: str
