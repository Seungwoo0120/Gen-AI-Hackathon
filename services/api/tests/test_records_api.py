from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.db import Base, get_session, make_engine
from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    test_engine = make_engine("sqlite://")
    Base.metadata.create_all(test_engine)
    test_session = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)

    def override_get_session() -> Iterator[Session]:
        with test_session() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_session, None)
        test_engine.dispose()


def test_symptom_create_list_delete_round_trip_uses_contract_shape(client: TestClient) -> None:
    created = client.post(
        "/symptoms",
        json={
            "name": "Headache",
            "details": "Started after lunch",
            "severity": 3,
            "startedAt": "2026-09-20T01:00:00Z",
            "recordedAt": "2026-09-20T10:00:00",
        },
    )

    assert created.status_code == 201
    body = created.json()
    assert set(body) == {
        "id",
        "name",
        "details",
        "severity",
        "startedAt",
        "recordedAt",
        "source",
    }
    assert body["source"] == "manual"
    assert body["recordedAt"] == "2026-09-20T10:00:00+08:00"
    assert body["startedAt"] == "2026-09-20T09:00:00+08:00"

    listed = client.get("/symptoms")
    assert listed.status_code == 200
    assert listed.json() == [body]

    deleted = client.delete(f"/symptoms/{body['id']}")
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert client.get("/symptoms").json() == []


def test_symptom_filters_are_inclusive_from_exclusive_to_and_newest_first(
    client: TestClient,
) -> None:
    ids = {}
    for hour in (9, 10, 11):
        response = client.post(
            "/symptoms",
            json={
                "name": f"Symptom {hour}",
                "recordedAt": f"2026-09-20T{hour:02}:00:00+08:00",
            },
        )
        assert response.status_code == 201
        ids[hour] = response.json()["id"]

    listed = client.get("/symptoms")
    assert [entry["id"] for entry in listed.json()] == [ids[11], ids[10], ids[9]]

    filtered = client.get(
        "/symptoms",
        params={
            "from": "2026-09-20T10:00:00+08:00",
            "to": "2026-09-20T11:00:00+08:00",
        },
    )
    assert filtered.status_code == 200
    assert [entry["id"] for entry in filtered.json()] == [ids[10]]


def test_symptom_recorded_at_defaults_to_an_aware_hong_kong_time(client: TestClient) -> None:
    response = client.post("/symptoms", json={"name": "Short-lived discomfort"})

    assert response.status_code == 201
    assert response.json()["recordedAt"].endswith("+08:00")


def test_medication_create_list_delete_round_trip_uses_contract_shape(
    client: TestClient,
) -> None:
    created = client.post(
        "/medications",
        json={
            "name": "Example tablet",
            "dose": "1 tablet",
            "schedule": {"times": ["08:30", "20:30"], "daysOfWeek": [1, 3, 5]},
            "notes": "Take with food",
        },
    )

    assert created.status_code == 201
    body = created.json()
    assert set(body) == {"id", "name", "dose", "schedule", "notes", "createdAt"}
    assert body["schedule"] == {"times": ["08:30", "20:30"], "daysOfWeek": [1, 3, 5]}
    assert body["createdAt"].endswith("+08:00")

    listed = client.get("/medications")
    assert listed.status_code == 200
    assert listed.json() == [body]

    deleted = client.delete(f"/medications/{body['id']}")
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert client.get("/medications").json() == []


def test_medication_put_fully_replaces_and_clears_optional_fields(client: TestClient) -> None:
    created = client.post(
        "/medications",
        json={
            "name": "Original tablet",
            "dose": "10 mg",
            "schedule": {"times": ["09:00"], "daysOfWeek": [2]},
            "notes": "Original note",
        },
    ).json()

    updated = client.put(
        f"/medications/{created['id']}",
        json={"name": "Replacement tablet"},
    )

    assert updated.status_code == 200
    assert updated.json() == {
        "id": created["id"],
        "name": "Replacement tablet",
        "dose": None,
        "schedule": None,
        "notes": None,
        "createdAt": created["createdAt"],
    }
    assert client.get("/medications").json() == [updated.json()]


def test_unknown_record_ids_return_contract_error_body(client: TestClient) -> None:
    missing_id = "00000000-0000-0000-0000-000000000000"

    symptom_delete = client.delete(f"/symptoms/{missing_id}")
    medication_update = client.put(
        f"/medications/{missing_id}",
        json={"name": "Replacement tablet"},
    )
    medication_delete = client.delete(f"/medications/{missing_id}")

    assert symptom_delete.status_code == 404
    assert symptom_delete.json() == {"detail": "Symptom not found"}
    assert medication_update.status_code == 404
    assert medication_update.json() == {"detail": "Medication not found"}
    assert medication_delete.status_code == 404
    assert medication_delete.json() == {"detail": "Medication not found"}


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/symptoms", {"name": "Headache", "severity": 6}),
        ("/symptoms", {"name": ""}),
        (
            "/medications",
            {"name": "Example tablet", "schedule": {"times": ["9:00"]}},
        ),
        ("/medications", {"name": ""}),
    ],
)
def test_invalid_record_inputs_return_422(
    client: TestClient,
    path: str,
    payload: dict[str, object],
) -> None:
    assert client.post(path, json=payload).status_code == 422
