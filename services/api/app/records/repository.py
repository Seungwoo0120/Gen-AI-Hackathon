from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.records.models import (
    Medication,
    SymptomEntry,
    ensure_hong_kong_timezone,
    now_hong_kong,
)
from app.records.schemas import MedicationInput, SymptomInput, SymptomSource


def create_symptom(
    session: Session,
    data: SymptomInput,
    source: SymptomSource,
) -> SymptomEntry:
    entry = SymptomEntry(
        name=data.name,
        details=data.details,
        severity=data.severity,
        started_at=data.started_at,
        recorded_at=data.recorded_at or now_hong_kong(),
        source=source,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def list_symptoms(
    session: Session,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> list[SymptomEntry]:
    statement = select(SymptomEntry)
    if from_time is not None:
        statement = statement.where(
            SymptomEntry.recorded_at >= ensure_hong_kong_timezone(from_time)
        )
    if to_time is not None:
        statement = statement.where(SymptomEntry.recorded_at < ensure_hong_kong_timezone(to_time))
    statement = statement.order_by(SymptomEntry.recorded_at.desc(), SymptomEntry.created_at.desc())
    return list(session.scalars(statement))


def delete_symptom(session: Session, symptom_id: str) -> bool:
    entry = session.get(SymptomEntry, symptom_id)
    if entry is None:
        return False
    session.delete(entry)
    session.commit()
    return True


def create_medication(session: Session, data: MedicationInput) -> Medication:
    medication = Medication(
        name=data.name,
        dose=data.dose,
        schedule=_serialize_schedule(data),
        notes=data.notes,
    )
    session.add(medication)
    session.commit()
    session.refresh(medication)
    return medication


def list_medications(session: Session) -> list[Medication]:
    statement = select(Medication).order_by(Medication.created_at.desc())
    return list(session.scalars(statement))


def update_medication(
    session: Session,
    medication_id: str,
    data: MedicationInput,
) -> Medication | None:
    medication = session.get(Medication, medication_id)
    if medication is None:
        return None
    medication.name = data.name
    medication.dose = data.dose
    medication.schedule = _serialize_schedule(data)
    medication.notes = data.notes
    session.commit()
    session.refresh(medication)
    return medication


def delete_medication(session: Session, medication_id: str) -> bool:
    medication = session.get(Medication, medication_id)
    if medication is None:
        return False
    session.delete(medication)
    session.commit()
    return True


def _serialize_schedule(data: MedicationInput) -> dict[str, object] | None:
    if data.schedule is None:
        return None
    return data.schedule.model_dump(mode="json")
