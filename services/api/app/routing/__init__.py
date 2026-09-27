"""Rule-based care routing and emergency detection. Never diagnoses."""

from app.routing.engine import assess, load_rules, match
from app.routing.schemas import EmergencyCheck


def check_emergency(text: str, age_years: int | None = None) -> EmergencyCheck:
    """Emergency check for any user text (e.g. chat messages in /extract).

    Reports only call_999 rules; lower-level matches are left to /routing/assess.
    """
    codes = [
        rule.id for rule in match(text, age_years, load_rules()) if rule.care_level == "call_999"
    ]
    return EmergencyCheck(emergency=bool(codes), reason_codes=codes)


__all__ = ["assess", "check_emergency"]
