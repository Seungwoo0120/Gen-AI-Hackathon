"""Fill the dev database with one made-up person, so every screen has something to show.

Usage (in services/api, venv active; writes to DATABASE_URL from the root .env):
    python -m scripts.seed_demo           # add the demo records
    python -m scripts.seed_demo --reset   # delete ALL symptoms and medications first

Everything here is invented: an older person with high blood pressure, diabetes and
high cholesterol. Amlodipine + simvastatin shows one interaction warning from the
curated dataset; adding "Panadol Cold & Flu" in the demo shows the duplicate warning.
"""

import argparse
from datetime import timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db import SessionLocal, init_db
from app.records.models import Medication, SymptomEntry, now_hong_kong
from app.records.repository import create_medication, create_symptom
from app.records.schemas import MedicationInput, SymptomInput

MEDICATIONS = [
    {"name": "Amlodipine", "dose": "5 mg", "schedule": {"times": ["08:00"]}},
    {"name": "Metformin", "dose": "500 mg", "schedule": {"times": ["08:00", "20:00"]}},
    {"name": "Simvastatin", "dose": "20 mg", "schedule": {"times": ["21:00"]}},
    {"name": "Panadol", "dose": "500 mg", "notes": "Only when the knee hurts"},
]

# (days ago recorded, days ago started or None, name, severity, details, source)
SYMPTOMS = [
    (12, 14, "Left knee pain", 3, "Worse when climbing stairs", "manual"),
    (6, 6, "Dizziness when standing up", 2, "Mostly in the morning, passes in a minute", "chat"),
    (4, None, "Poor sleep", 2, "Wakes up at 3 am because of knee pain", "chat"),
    (2, 14, "Left knee pain", 4, "Now hard to walk to the market", "chat"),
]


def seed(session: Session) -> None:
    # Same morning time every day, so records do not all look like they were made at night.
    morning = now_hong_kong().replace(hour=9, minute=30, second=0, microsecond=0)
    for medication in MEDICATIONS:
        create_medication(session, MedicationInput.model_validate(medication))
    for recorded, started, name, severity, details, source in SYMPTOMS:
        entry = SymptomInput(
            name=name,
            details=details,
            severity=severity,
            started_at=morning - timedelta(days=started) if started is not None else None,
            recorded_at=morning - timedelta(days=recorded),
        )
        create_symptom(session, entry, source)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--reset", action="store_true", help="delete all records first")
    args = parser.parse_args()

    init_db()
    with SessionLocal() as session:
        if args.reset:
            session.execute(delete(SymptomEntry))
            session.execute(delete(Medication))
            session.commit()
        seed(session)
    print(f"Added {len(MEDICATIONS)} medications and {len(SYMPTOMS)} symptom entries.")


if __name__ == "__main__":
    main()
