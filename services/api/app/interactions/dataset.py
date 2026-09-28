from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Literal

import yaml

DATASET_VERSION = "2026.09.1"
DATASET_PATH = Path(__file__).parent / "data" / "interactions.yaml"

Severity = Literal["major", "moderate", "minor"]


@dataclass(frozen=True)
class Source:
    title: str
    url: str


@dataclass(frozen=True)
class Medication:
    id: str
    names: tuple[str, ...]
    ingredients: tuple[str, ...]
    sources: tuple[Source, ...]
    reviewed: bool


@dataclass(frozen=True)
class Interaction:
    id: str
    ingredients: tuple[str, str]
    severity: Severity
    summary: dict[str, str]
    sources: tuple[Source, ...]
    reviewed: bool


@dataclass(frozen=True)
class DuplicateRisk:
    id: str
    ingredient: str
    severity: Severity
    summary: dict[str, str]
    sources: tuple[Source, ...]
    reviewed: bool


@dataclass(frozen=True)
class InteractionDataset:
    version: str
    medications: tuple[Medication, ...]
    interactions: tuple[Interaction, ...]
    duplicate_risks: tuple[DuplicateRisk, ...]


def _sources(raw_sources: list[dict[str, str]]) -> tuple[Source, ...]:
    return tuple(Source(**source) for source in raw_sources)


def _validate(dataset: InteractionDataset) -> None:
    if dataset.version != DATASET_VERSION:
        raise ValueError("Dataset version does not match DATASET_VERSION")

    entries = (*dataset.medications, *dataset.interactions, *dataset.duplicate_risks)
    ids = [entry.id for entry in entries]
    if len(ids) != len(set(ids)):
        raise ValueError("Dataset entry IDs must be unique")
    if any(not entry.sources for entry in entries):
        raise ValueError("Every dataset entry must have a source")
    if any(not source.title or not source.url for entry in entries for source in entry.sources):
        raise ValueError("Every dataset source must have a title and URL")

    name_owners: dict[str, str] = {}
    known_ingredients: set[str] = set()
    ingredient_owners: dict[str, set[str]] = {}
    for medication in dataset.medications:
        if not medication.names or not medication.ingredients:
            raise ValueError("Every medication must have names and ingredients")
        for name in medication.names:
            normalized = name.strip().casefold()
            owner = name_owners.setdefault(normalized, medication.id)
            if owner != medication.id:
                raise ValueError(f"Medication name is ambiguous: {name}")
        for ingredient in medication.ingredients:
            known_ingredients.add(ingredient)
            ingredient_owners.setdefault(ingredient, set()).add(medication.id)

    interaction_pairs: set[frozenset[str]] = set()
    for interaction in dataset.interactions:
        pair = frozenset(interaction.ingredients)
        if len(pair) != 2 or not pair <= known_ingredients:
            raise ValueError(f"Invalid interaction ingredients: {interaction.id}")
        if pair in interaction_pairs:
            raise ValueError(f"Duplicate interaction pair: {interaction.id}")
        interaction_pairs.add(pair)

    duplicate_ingredients = [risk.ingredient for risk in dataset.duplicate_risks]
    if len(duplicate_ingredients) != len(set(duplicate_ingredients)):
        raise ValueError("Duplicate-risk ingredients must be unique")
    if not set(duplicate_ingredients) <= known_ingredients:
        raise ValueError("Duplicate risk references an unknown ingredient")
    if any(
        risk.severity != ("major" if risk.ingredient == "paracetamol" else "moderate")
        for risk in dataset.duplicate_risks
    ):
        raise ValueError(
            "Duplicate-risk severity must be major for paracetamol and moderate otherwise"
        )
    shared_ingredients = {
        ingredient for ingredient, owners in ingredient_owners.items() if len(owners) >= 2
    }
    if shared_ingredients != set(duplicate_ingredients):
        raise ValueError("Every shared ingredient must have exactly one duplicate-risk entry")


@cache
def load_dataset() -> InteractionDataset:
    raw = yaml.safe_load(DATASET_PATH.read_text(encoding="utf-8"))
    dataset = InteractionDataset(
        version=raw["version"],
        medications=tuple(
            Medication(
                id=item["id"],
                names=tuple(item["names"]),
                ingredients=tuple(item["ingredients"]),
                sources=_sources(item["sources"]),
                reviewed=item["reviewed"],
            )
            for item in raw["medications"]
        ),
        interactions=tuple(
            Interaction(
                id=item["id"],
                ingredients=tuple(item["ingredients"]),
                severity=item["severity"],
                summary=item["summary"],
                sources=_sources(item["sources"]),
                reviewed=item["reviewed"],
            )
            for item in raw["interactions"]
        ),
        duplicate_risks=tuple(
            DuplicateRisk(
                id=item["id"],
                ingredient=item["ingredient"],
                severity=item["severity"],
                summary=item["summary"],
                sources=_sources(item["sources"]),
                reviewed=item["reviewed"],
            )
            for item in raw["duplicateRisks"]
        ),
    )
    _validate(dataset)
    return dataset
