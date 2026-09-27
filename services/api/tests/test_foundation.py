from fastapi.testclient import TestClient
from sqlalchemy import text

from app.config import Settings
from app.db import SessionLocal
from app.main import app
from app.schemas import ApiModel


class _Example(ApiModel):
    reason_codes: list[str]


def test_api_model_uses_camel_case_json() -> None:
    model = _Example.model_validate({"reasonCodes": ["chest_pain"]})
    assert model.model_dump(by_alias=True) == {"reasonCodes": ["chest_pain"]}
    assert _Example(reason_codes=[]).reason_codes == []


def test_settings_default_to_mock_sources(monkeypatch) -> None:
    monkeypatch.delenv("DATA_SOURCE", raising=False)
    assert Settings(_env_file=None).data_source == "mock"


def test_in_memory_db_is_shared_across_sessions() -> None:
    with SessionLocal() as session:
        session.execute(text("create table probe (x integer)"))
        session.execute(text("insert into probe values (1)"))
        session.commit()
    with SessionLocal() as session:
        assert session.execute(text("select x from probe")).scalar_one() == 1
        session.execute(text("drop table probe"))
        session.commit()


def test_cors_allows_web_origin() -> None:
    with TestClient(app) as client:
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
