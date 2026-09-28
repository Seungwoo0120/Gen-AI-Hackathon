from fastapi.testclient import TestClient


def _symptom(client: TestClient, name: str, recorded_at: str, **extra) -> dict:
    response = client.post("/symptoms", json={"name": name, "recordedAt": recorded_at, **extra})
    assert response.status_code == 201
    return response.json()


def test_empty_summary_has_contract_shape(client: TestClient) -> None:
    body = client.get("/summary").json()

    assert set(body) == {
        "generatedAt",
        "from",
        "to",
        "symptoms",
        "medications",
        "interactionWarnings",
    }
    assert body["symptoms"] == body["medications"] == body["interactionWarnings"] == []
    assert body["generatedAt"].endswith("+08:00")


def test_summary_filters_symptoms_by_date_and_echoes_range(client: TestClient) -> None:
    _symptom(client, "cough", "2026-09-01T09:00:00+08:00")
    _symptom(client, "headache", "2026-09-20T09:00:00+08:00")

    body = client.get(
        "/summary", params={"from": "2026-09-10T00:00:00+08:00", "to": "2026-09-30T00:00:00+08:00"}
    ).json()

    assert [s["name"] for s in body["symptoms"]] == ["headache"]
    assert body["from"] == "2026-09-10T00:00:00+08:00"
    assert body["to"] == "2026-09-30T00:00:00+08:00"


def test_summary_includes_medications_and_curated_warnings(client: TestClient) -> None:
    for name in ("Panadol", "paracetamol", "Vitamin C"):
        assert client.post("/medications", json={"name": name}).status_code == 201

    body = client.get("/summary").json()

    assert sorted(m["name"] for m in body["medications"]) == ["Panadol", "Vitamin C", "paracetamol"]
    assert [(w["kind"], w["ingredient"]) for w in body["interactionWarnings"]] == [
        ("duplicate_ingredient", "paracetamol")
    ]
    assert body["interactionWarnings"][0]["sources"]


def test_symptom_source_defaults_to_manual_and_accepts_chat(client: TestClient) -> None:
    assert _symptom(client, "fever", "2026-09-20T09:00:00+08:00")["source"] == "manual"
    chat = _symptom(client, "fever", "2026-09-20T10:00:00+08:00", source="chat")
    assert chat["source"] == "chat"
    bad = client.post("/symptoms", json={"name": "fever", "source": "llm"})
    assert bad.status_code == 422
