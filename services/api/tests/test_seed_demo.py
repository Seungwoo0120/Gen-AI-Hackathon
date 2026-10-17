from sqlalchemy.orm import sessionmaker

from app.db import Base, make_engine
from app.interactions.checker import check_interactions
from app.records.repository import list_medications, list_symptoms
from scripts.seed_demo import MEDICATIONS, SYMPTOMS, seed


def test_seed_adds_every_record() -> None:
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, expire_on_commit=False)() as session:
        seed(session)
        assert len(list_medications(session)) == len(MEDICATIONS)
        assert len(list_symptoms(session)) == len(SYMPTOMS)
    engine.dispose()


def test_demo_medications_show_one_warning_and_are_all_recognised() -> None:
    result = check_interactions([medication["name"] for medication in MEDICATIONS])
    assert result.unrecognized == []
    assert [warning.severity for warning in result.warnings] == ["moderate"]


def test_adding_panadol_cold_and_flu_shows_the_duplicate_warning() -> None:
    names = [medication["name"] for medication in MEDICATIONS] + ["Panadol Cold & Flu"]
    kinds = {warning.kind for warning in check_interactions(names).warnings}
    assert "duplicate_ingredient" in kinds
