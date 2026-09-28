from collections import Counter

from app.interactions.dataset import DATASET_VERSION, load_dataset


def test_dataset_has_expected_scope_and_version() -> None:
    dataset = load_dataset()

    assert dataset.version == DATASET_VERSION
    assert 20 <= len(dataset.medications) <= 30


def test_every_entry_has_a_unique_id_and_checkable_source() -> None:
    dataset = load_dataset()
    entries = (*dataset.medications, *dataset.interactions, *dataset.duplicate_risks)

    assert len({entry.id for entry in entries}) == len(entries)
    assert all(entry.reviewed is False for entry in entries)
    assert all(entry.sources for entry in entries)
    assert all(
        source.title and source.url.startswith("https://")
        for entry in entries
        for source in entry.sources
    )


def test_medication_names_are_unique_and_ingredients_are_present() -> None:
    medications = load_dataset().medications
    normalized_names = [name.strip().casefold() for item in medications for name in item.names]

    assert len(normalized_names) == len(set(normalized_names))
    assert all(item.ingredients for item in medications)


def test_interactions_reference_known_ingredients_without_duplicate_pairs() -> None:
    dataset = load_dataset()
    known_ingredients = {
        ingredient for medication in dataset.medications for ingredient in medication.ingredients
    }
    pairs = [frozenset(interaction.ingredients) for interaction in dataset.interactions]

    assert all(len(pair) == 2 and pair <= known_ingredients for pair in pairs)
    assert len(pairs) == len(set(pairs))


def test_every_shared_ingredient_has_one_duplicate_risk() -> None:
    dataset = load_dataset()
    ingredient_counts = Counter(
        ingredient
        for medication in dataset.medications
        for ingredient in set(medication.ingredients)
    )
    shared = {ingredient for ingredient, count in ingredient_counts.items() if count >= 2}

    assert shared == {risk.ingredient for risk in dataset.duplicate_risks}
