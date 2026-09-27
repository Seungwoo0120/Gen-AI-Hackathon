from datetime import datetime

from fastapi.testclient import TestClient

from app.adapters.ae import get_ae_source
from app.adapters.ae.live import HONG_KONG_TIMEZONE, LiveAeWaitTimesSource
from app.main import app


def test_mock_route_returns_sorted_camel_case_contract() -> None:
    with TestClient(app) as client:
        response = client.get("/ae/wait-times")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"hospitals", "sourceUpdatedAt", "fetchedAt", "stale"}
    assert len(body["hospitals"]) >= 5
    assert body["stale"] is False
    assert body["sourceUpdatedAt"].endswith("+08:00")
    assert body["fetchedAt"].endswith("+08:00")

    minutes = [hospital["waitMinutes"] for hospital in body["hospitals"]]
    assert minutes == [15, 90, 120, 240, None]
    assert set(body["hospitals"][0]) == {
        "hospitalId",
        "name",
        "waitTimeText",
        "waitMinutes",
        "district",
    }
    assert body["hospitals"][0]["name"]["zhHant"]


def test_route_returns_503_when_live_source_has_no_cache() -> None:
    def fail_fetch(_: str) -> dict[str, object]:
        raise OSError("source unavailable")

    source = LiveAeWaitTimesSource(
        fetch_json=fail_fetch,
        clock=lambda: datetime.now(HONG_KONG_TIMEZONE),
    )
    app.dependency_overrides[get_ae_source] = lambda: source
    try:
        with TestClient(app) as client:
            response = client.get("/ae/wait-times")
    finally:
        app.dependency_overrides.pop(get_ae_source, None)

    assert response.status_code == 503
    assert response.json() == {"detail": "A&E waiting time data is unavailable"}
