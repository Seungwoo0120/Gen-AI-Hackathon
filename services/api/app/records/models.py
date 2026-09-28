from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import JSON, CheckConstraint, DateTime, Integer, String, Text
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

from app.db import Base

HONG_KONG_TIMEZONE = ZoneInfo("Asia/Hong_Kong")


def now_hong_kong() -> datetime:
    return datetime.now(HONG_KONG_TIMEZONE)


def ensure_hong_kong_timezone(value: datetime) -> datetime:
    """Interpret naive values as Hong Kong time and normalize aware values to it."""
    if value.tzinfo is None:
        return value.replace(tzinfo=HONG_KONG_TIMEZONE)
    return value.astimezone(HONG_KONG_TIMEZONE)


class AwareDateTime(TypeDecorator[datetime]):
    """Keep datetime values aware even when SQLite drops timezone information."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        del dialect
        if value is None:
            return None
        return ensure_hong_kong_timezone(value)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        del dialect
        if value is None:
            return None
        return ensure_hong_kong_timezone(value)


def _new_id() -> str:
    return str(uuid4())


class SymptomEntry(Base):
    __tablename__ = "symptom_entries"
    __table_args__ = (
        CheckConstraint("source IN ('chat', 'manual')", name="ck_symptom_entries_source"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    name: Mapped[str] = mapped_column(String(200))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(AwareDateTime(), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(AwareDateTime())
    source: Mapped[str] = mapped_column(String(6))
    created_at: Mapped[datetime] = mapped_column(AwareDateTime(), default=now_hong_kong)


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    name: Mapped[str] = mapped_column(String(200))
    dose: Mapped[str | None] = mapped_column(String(100), nullable=True)
    schedule: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime(), default=now_hong_kong)
