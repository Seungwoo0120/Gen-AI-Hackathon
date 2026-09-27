"""Match free text against the rules in rules.yaml. Never diagnoses."""

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml

CareLevel = Literal["call_999", "ae", "gp", "specialist"]

RULES_PATH = Path(__file__).with_name("rules.yaml")
# Most urgent first; the result is the most urgent level among matched rules.
URGENCY: tuple[CareLevel, ...] = ("call_999", "ae", "gp", "specialist")
DEFAULT_LEVEL: CareLevel = "gp"


@dataclass(frozen=True)
class Rule:
    id: str
    care_level: CareLevel
    source: str
    reviewed: bool
    en: tuple[str, ...]
    zh: tuple[str, ...]
    examples: tuple[str, ...]
    max_age_years: int | None = None

    def matches(self, normalized_text: str, age_years: int | None) -> bool:
        if self.max_age_years is not None and (age_years is None or age_years > self.max_age_years):
            return False
        if any(phrase in normalized_text for phrase in self.zh):
            return True
        return any(_phrase_regex(phrase).search(normalized_text) for phrase in self.en)


@dataclass(frozen=True)
class RuleSet:
    version: str
    sources: dict[str, dict[str, str]]
    rules: tuple[Rule, ...]


@dataclass(frozen=True)
class Assessment:
    care_level: CareLevel
    emergency: bool
    reason_codes: list[str]
    rule_set_version: str


def normalize(text: str) -> str:
    text = text.lower().replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", text).strip()


@lru_cache(maxsize=512)
def _phrase_regex(phrase: str) -> re.Pattern[str]:
    # Word boundaries stop "stroke" matching inside unrelated words; flexible spaces
    # tolerate double spaces the normalizer already collapses.
    body = r"\s+".join(re.escape(word) for word in phrase.split())
    return re.compile(rf"(?<![\w']){body}(?![\w'])")


def _parse_rule(raw: dict) -> Rule:
    patterns = raw.get("patterns", {})
    return Rule(
        id=raw["id"],
        care_level=raw["care_level"],
        source=raw["source"],
        reviewed=bool(raw.get("reviewed", False)),
        en=tuple(normalize(p) for p in patterns.get("en", [])),
        zh=tuple(patterns.get("zh", [])),
        examples=tuple(raw.get("examples", [])),
        max_age_years=raw.get("max_age_years"),
    )


@lru_cache
def load_rules(path: Path = RULES_PATH) -> RuleSet:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    raw_rules = data.get("rules", []) + data.get("age_rules", [])
    return RuleSet(
        version=str(data["version"]),
        sources=data["sources"],
        rules=tuple(_parse_rule(r) for r in raw_rules),
    )


def match(text: str, age_years: int | None, rule_set: RuleSet) -> list[Rule]:
    """Matched rules, most urgent first."""
    normalized = normalize(text)
    matched = [rule for rule in rule_set.rules if rule.matches(normalized, age_years)]
    return sorted(matched, key=lambda rule: (URGENCY.index(rule.care_level), rule.id))


def assess(text: str, age_years: int | None = None, rule_set: RuleSet | None = None) -> Assessment:
    rule_set = rule_set or load_rules()
    matched = match(text, age_years, rule_set)
    care_level = matched[0].care_level if matched else DEFAULT_LEVEL
    return Assessment(
        care_level=care_level,
        emergency=care_level == "call_999",
        reason_codes=[rule.id for rule in matched],
        rule_set_version=rule_set.version,
    )
