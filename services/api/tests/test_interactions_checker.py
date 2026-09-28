from app.interactions import check_interactions


def test_duplicate_paracetamol_ingredient_has_one_sourced_warning() -> None:
    result = check_interactions(["Panadol", "Panadol Cold & Flu"])

    assert result.unrecognized == []
    assert len(result.warnings) == 1
    warning = result.warnings[0]
    assert warning.kind == "duplicate_ingredient"
    assert warning.severity == "major"
    assert warning.ingredient == "paracetamol"
    assert warning.medications == ["Panadol", "Panadol Cold & Flu"]
    assert warning.sources


def test_known_interaction_has_sources_and_keeps_input_names() -> None:
    result = check_interactions(["Marevan", "Brufen"])

    assert len(result.warnings) == 1
    warning = result.warnings[0]
    assert warning.kind == "interaction"
    assert warning.severity == "major"
    assert warning.medications == ["Marevan", "Brufen"]
    assert warning.sources


def test_unknown_name_is_unrecognized_without_a_warning() -> None:
    result = check_interactions(["Not a medicine"])

    assert result.warnings == []
    assert result.unrecognized == ["Not a medicine"]


def test_matching_ignores_case_and_surrounding_whitespace() -> None:
    result = check_interactions(["  PANADOL  ", "panadol cold & FLU"])

    assert result.unrecognized == []
    assert result.warnings[0].medications == ["  PANADOL  ", "panadol cold & FLU"]


def test_repeated_input_does_not_warn_against_itself() -> None:
    result = check_interactions(["Panadol", "Panadol"])

    assert result.warnings == []
    assert result.unrecognized == []


def test_warning_order_is_severity_then_names() -> None:
    result = check_interactions(["Losartan", "Ibuprofen", "Warfarin"])

    assert [(warning.severity, warning.medications) for warning in result.warnings] == [
        ("major", ["Ibuprofen", "Warfarin"]),
        ("moderate", ["Losartan", "Ibuprofen"]),
    ]


def test_two_names_for_the_same_medication_warn_about_double_dose() -> None:
    for names in (["Panadol", "paracetamol"], ["Panadol", "必理痛"]):
        result = check_interactions(names)

        assert len(result.warnings) == 1, names
        warning = result.warnings[0]
        assert warning.kind == "duplicate_ingredient"
        assert warning.severity == "major"
        assert warning.ingredient == "paracetamol"
        assert warning.medications == names


def test_same_combination_product_under_two_names_warns_only_on_curated_ingredients() -> None:
    result = check_interactions(["Panadol Cold & Flu", "必理痛傷風感冒丸"])

    assert [(w.kind, w.ingredient) for w in result.warnings] == [
        ("duplicate_ingredient", "paracetamol")
    ]


def test_exact_same_name_twice_is_merged_without_warning() -> None:
    result = check_interactions(["Panadol", " panadol "])

    assert result.warnings == []
    assert result.unrecognized == []
