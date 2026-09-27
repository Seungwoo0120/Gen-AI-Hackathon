import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routing import assess, check_emergency
from app.routing.engine import URGENCY, load_rules

RULES = load_rules().rules
client = TestClient(app)


# --- rule file integrity ---


def test_rule_ids_are_unique() -> None:
    ids = [rule.id for rule in RULES]
    assert len(ids) == len(set(ids))


@pytest.mark.parametrize("rule", RULES, ids=lambda r: r.id)
def test_rule_is_well_formed(rule) -> None:
    assert rule.care_level in URGENCY
    assert rule.source in load_rules().sources
    assert rule.en or rule.zh, "rule has no patterns"
    assert rule.examples, "rule needs examples so its patterns are tested"


@pytest.mark.parametrize(
    ("rule", "example"),
    [(rule, example) for rule in RULES for example in rule.examples],
    ids=lambda v: v.id if hasattr(v, "id") else v,
)
def test_every_example_matches_its_rule(rule, example) -> None:
    age = rule.max_age_years
    result = assess(example, age_years=age)
    assert rule.id in result.reason_codes
    # The rule's own level (or something more urgent) must win.
    assert URGENCY.index(result.care_level) <= URGENCY.index(rule.care_level)


# --- behaviour ---


def test_no_match_routes_to_gp() -> None:
    result = assess("I have a mild runny nose")
    assert result.care_level == "gp"
    assert result.emergency is False
    assert result.reason_codes == []


def test_most_urgent_level_wins_and_all_reasons_are_reported() -> None:
    result = assess("I hit my head and now I have chest pain")
    assert result.care_level == "call_999"
    assert result.emergency is True
    assert result.reason_codes == ["chest_pain", "head_injury"]


def test_negation_is_deliberately_ignored() -> None:
    # Erring towards urgency is the documented design.
    assert assess("no chest pain but feeling tired").emergency is True


def test_matching_ignores_case_quotes_and_spacing() -> None:
    assert assess("I  CAN’T   Breathe").emergency is True


def test_english_phrases_match_on_word_boundaries() -> None:
    assert "stroke_signs" not in assess("I keep a strokes diary").reason_codes
    assert "chest_pain" not in assess("my chest painting class").reason_codes


def test_mixed_language_text_matches_both() -> None:
    result = assess("my mother 心口痛 and hit her head")
    assert {"chest_pain", "head_injury"} <= set(result.reason_codes)


def test_age_rule_only_applies_within_age() -> None:
    assert "infant_fever" in assess("fever", age_years=0).reason_codes
    assert "infant_fever" not in assess("fever", age_years=30).reason_codes
    assert "infant_fever" not in assess("fever").reason_codes


def test_check_emergency_reports_only_call_999_rules() -> None:
    check = check_emergency("hit my head and chest pain")
    assert check.emergency is True
    assert check.reason_codes == ["chest_pain"]
    assert check_emergency("hit my head").emergency is False


# --- API ---


def test_route_returns_contract_shape() -> None:
    response = client.post("/routing/assess", json={"text": "胸口痛", "ageYears": 70, "lang": "en"})
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "careLevel": "call_999",
        "emergency": True,
        "reasonCodes": ["chest_pain"],
        "ruleSetVersion": load_rules().version,
    }


@pytest.mark.parametrize(
    "payload",
    [{"text": ""}, {"text": "x", "ageYears": -1}, {"text": "x", "lang": "fr"}, {}],
)
def test_route_rejects_invalid_input(payload) -> None:
    assert client.post("/routing/assess", json=payload).status_code == 422


def test_common_non_medical_phrases_do_not_trigger() -> None:
    assert assess("I broke my phone").care_level == "gp"
    assert assess("屋企斷咗電").care_level == "gp"
