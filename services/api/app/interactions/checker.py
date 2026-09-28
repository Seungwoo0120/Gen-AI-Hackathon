from dataclasses import dataclass
from itertools import combinations

from app.interactions.dataset import DATASET_VERSION, Medication, load_dataset
from app.interactions.schemas import (
    InteractionCheckResult,
    InteractionWarning,
    LocalizedText,
    SourceReference,
)

SEVERITY_ORDER = {"major": 0, "moderate": 1, "minor": 2}


@dataclass(frozen=True)
class MatchedMedication:
    input_name: str
    medication: Medication


def _normalized(value: str) -> str:
    return value.strip().casefold()


def _warning_sort_key(warning: InteractionWarning) -> tuple[object, ...]:
    names = tuple(_normalized(name) for name in warning.medications)
    return (SEVERITY_ORDER[warning.severity], names, warning.kind, warning.ingredient or "")


def check_interactions(names: list[str]) -> InteractionCheckResult:
    dataset = load_dataset()
    name_index = {
        _normalized(name): medication
        for medication in dataset.medications
        for name in medication.names
    }
    interaction_index = {
        frozenset(interaction.ingredients): interaction for interaction in dataset.interactions
    }
    duplicate_index = {risk.ingredient: risk for risk in dataset.duplicate_risks}

    matched: list[MatchedMedication] = []
    seen_names: set[str] = set()
    unrecognized: list[str] = []
    for input_name in names:
        # Only the exact same name is merged. Two different names for one medication
        # (e.g. "Panadol" and "paracetamol") are a double dose and must be warned about.
        normalized = _normalized(input_name)
        if normalized in seen_names:
            continue
        seen_names.add(normalized)
        medication = name_index.get(normalized)
        if medication is None:
            unrecognized.append(input_name)
        else:
            matched.append(MatchedMedication(input_name=input_name, medication=medication))

    warnings: list[InteractionWarning] = []
    ingredient_matches: dict[str, list[MatchedMedication]] = {}
    for item in matched:
        for ingredient in item.medication.ingredients:
            ingredient_matches.setdefault(ingredient, []).append(item)

    for ingredient, items in ingredient_matches.items():
        risk = duplicate_index.get(ingredient)
        # No curated duplicate risk means no sourced warning to give.
        if len(items) < 2 or risk is None:
            continue
        warnings.append(
            InteractionWarning(
                kind="duplicate_ingredient",
                severity=risk.severity,
                medications=[item.input_name for item in items],
                ingredient=ingredient,
                summary=LocalizedText(**risk.summary),
                sources=[
                    SourceReference(title=source.title, url=source.url) for source in risk.sources
                ],
            )
        )

    for left, right in combinations(matched, 2):
        if left.medication.id == right.medication.id:
            continue  # Same product twice is covered by the duplicate check above.
        for left_ingredient in left.medication.ingredients:
            for right_ingredient in right.medication.ingredients:
                interaction = interaction_index.get(frozenset((left_ingredient, right_ingredient)))
                if interaction is None:
                    continue
                warnings.append(
                    InteractionWarning(
                        kind="interaction",
                        severity=interaction.severity,
                        medications=[left.input_name, right.input_name],
                        summary=LocalizedText(**interaction.summary),
                        sources=[
                            SourceReference(title=source.title, url=source.url)
                            for source in interaction.sources
                        ],
                    )
                )

    warnings.sort(key=_warning_sort_key)
    return InteractionCheckResult(
        warnings=warnings,
        unrecognized=unrecognized,
        dataset_version=DATASET_VERSION,
    )
