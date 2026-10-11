import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.adapters.ae import get_ae_source
from app.adapters.ae import live as ae_live
from app.adapters.ae.base import AeHospitalWaitTime, AeWaitTimesResponse, LocalizedText
from app.adapters.maps import TravelTimeUnavailable, calculate_travel_time, get_travel_time
from app.adapters.maps.mock import mock_travel_time
from app.config import Settings
from app.llm import triage as triage_module
from app.llm.triage import (
    SYSTEM_PROMPT,
    ClaudeTriageAgent,
    MockTriageAgent,
    TriageAgentError,
    get_triage_agent,
)
from app.main import app

client = TestClient(app)


def run(coro):
    return asyncio.run(coro)


class FakeAeSource:
    def __init__(self, waits: dict[str, int | None]) -> None:
        self._waits = waits

    async def get_wait_times(self) -> AeWaitTimesResponse:
        now = datetime(2026, 10, 1, tzinfo=UTC)
        hospitals = [
            AeHospitalWaitTime(
                hospital_id=name,
                name=LocalizedText(en=name),
                wait_time_text=LocalizedText(en="x"),
                wait_minutes=minutes,
            )
            for name, minutes in self._waits.items()
        ]
        return AeWaitTimesResponse(
            hospitals=hospitals, source_updated_at=now, fetched_at=now, stale=False
        )


def fixed_travel(minutes: int):
    return lambda origin, destination, mode: minutes


def text_block(text: str) -> SimpleNamespace:
    return SimpleNamespace(type="text", text=text)


def tool_use_block(name: str, input_: dict, id_: str) -> SimpleNamespace:
    return SimpleNamespace(type="tool_use", name=name, input=input_, id=id_)


def response(stop_reason: str, content: list) -> SimpleNamespace:
    return SimpleNamespace(stop_reason=stop_reason, content=content)


class FakeMessages:
    def __init__(self, responses: list) -> None:
        self._responses = list(responses)
        self.calls: list[dict] = []

    async def create(self, **kwargs: object) -> SimpleNamespace:
        # Snapshot messages: the caller keeps mutating (appending to) that same
        # list object on every round, so a bare reference would show the final
        # state for every past call, not what was actually sent at the time.
        self.calls.append({**kwargs, "messages": list(kwargs["messages"])})
        return self._responses.pop(0)


def claude_agent(responses: list, ae_source=None, travel_time=None) -> ClaudeTriageAgent:
    return ClaudeTriageAgent(
        SimpleNamespace(messages=FakeMessages(responses)),
        "test-model",
        ae_source or FakeAeSource({}),
        travel_time or fixed_travel(20),
    )


# --- ClaudeTriageAgent tool loop ---


def test_agent_calls_wait_times_then_travel_time_then_answers() -> None:
    responses = [
        response("tool_use", [tool_use_block("get_nearest_hospital_wait_times", {}, "t1")]),
        response(
            "tool_use",
            [
                tool_use_block(
                    "calculate_travel_time",
                    {
                        "origin": "Central",
                        "destination": "Queen Elizabeth Hospital",
                        "mode": "transit",
                    },
                    "t2",
                )
            ],
        ),
        response("end_turn", [text_block("Go to Queen Elizabeth Hospital.")]),
    ]
    agent = claude_agent(
        responses, FakeAeSource({"Queen Mary Hospital": 120, "Queen Elizabeth Hospital": 60})
    )
    messages_api = agent._client.messages

    result = run(agent.recommend("Central"))

    assert result == "Go to Queen Elizabeth Hospital."
    assert len(messages_api.calls) == 3
    assert messages_api.calls[0]["system"] == SYSTEM_PROMPT
    # Only the location reaches the LLM, never symptoms.
    assert messages_api.calls[0]["messages"][0]["content"] == "Current location: Central"
    assert messages_api.calls[0]["tools"][0]["name"] == "get_nearest_hospital_wait_times"
    wait_times_result = messages_api.calls[1]["messages"][-1]["content"][0]["content"]
    assert '"name": "Queen Elizabeth Hospital"' in wait_times_result
    assert '"wait_minutes": 60' in wait_times_result
    tool_result_message = messages_api.calls[2]["messages"][-1]
    assert '"travel_minutes": 20' in tool_result_message["content"][0]["content"]


def test_agent_raises_after_too_many_tool_rounds() -> None:
    endless = [
        response("tool_use", [tool_use_block("get_nearest_hospital_wait_times", {}, f"t{i}")])
        for i in range(triage_module.MAX_TOOL_ROUNDS)
    ]
    with pytest.raises(TriageAgentError):
        run(claude_agent(endless).recommend("Central"))


def test_unknown_tool_name_is_reported_but_does_not_crash() -> None:
    responses = [
        response("tool_use", [tool_use_block("not_a_real_tool", {}, "t1")]),
        response("end_turn", [text_block("ok")]),
    ]
    assert run(claude_agent(responses).recommend("Central")) == "ok"


# --- MockTriageAgent (no LLM) ---


def test_mock_agent_recommends_lowest_total_time() -> None:
    agent = MockTriageAgent(
        FakeAeSource({"Slow But Close": 180, "Fast Overall": 60}),
        lambda origin, destination, mode: {"Slow But Close": 5, "Fast Overall": 10}[destination],
    )

    result = run(agent.recommend("Central"))

    assert "Fast Overall" in result.split("\n")[0]  # 10+60=70 beats 5+180=185


def test_mock_agent_handles_missing_travel_time() -> None:
    def always_fails(origin: str, destination: str, mode: str) -> int:
        raise TravelTimeUnavailable("no key")

    agent = MockTriageAgent(FakeAeSource({"Only Hospital": 90}), always_fails)

    result = run(agent.recommend("Central"))

    assert "Only Hospital" in result


# --- agent and adapter selection ---


def test_mock_agent_is_default() -> None:
    settings = Settings(_env_file=None)
    agent = get_triage_agent(settings, FakeAeSource({}), fixed_travel(1))
    assert isinstance(agent, MockTriageAgent)


def test_live_without_key_falls_back_to_mock() -> None:
    settings = Settings(_env_file=None, data_source="live", llm_api_key="")
    agent = get_triage_agent(settings, FakeAeSource({}), fixed_travel(1))
    assert isinstance(agent, MockTriageAgent)


def test_live_with_key_uses_claude() -> None:
    settings = Settings(_env_file=None, data_source="live", llm_api_key="test-key")
    agent = get_triage_agent(settings, FakeAeSource({}), fixed_travel(1))
    assert isinstance(agent, ClaudeTriageAgent)


def test_travel_time_follows_data_source() -> None:
    assert get_travel_time(Settings(_env_file=None)) is mock_travel_time
    live = Settings(_env_file=None, data_source="live")
    assert get_travel_time(live) is calculate_travel_time


# --- route ---


class MustNotRunAeSource:
    async def get_wait_times(self) -> AeWaitTimesResponse:
        raise AssertionError("the agent must not run when the text is an emergency")


def test_route_short_circuits_on_emergency_text() -> None:
    app.dependency_overrides[get_ae_source] = MustNotRunAeSource
    try:
        body = client.post(
            "/api/v1/triage", json={"symptoms": "chest pain", "currentLocation": "Central"}
        ).json()
    finally:
        app.dependency_overrides.pop(get_ae_source, None)

    assert body["emergency"]["emergency"] is True
    assert "999" in body["recommendation"]


def test_route_in_mock_mode_never_touches_the_network(monkeypatch) -> None:
    def no_network(*args: object, **kwargs: object) -> None:
        raise AssertionError("DATA_SOURCE=mock must not make HTTP calls")

    monkeypatch.setattr("urllib.request.urlopen", no_network)
    monkeypatch.setattr(ae_live, "urlopen", no_network)

    response_body = client.post(
        "/api/v1/triage", json={"symptoms": "mild headache", "currentLocation": "Central"}
    )

    assert response_body.status_code == 200
    body = response_body.json()
    assert body["emergency"]["emergency"] is False
    # Mock A&E data + mock travel times: 15 min wait + 55 min travel is the lowest total.
    assert body["recommendation"].startswith(
        "Recommended: Alice Ho Miu Ling Nethersole Hospital -- 55 min travel + 15 min wait"
    )


@pytest.mark.parametrize("payload", [{"symptoms": ""}, {"symptoms": "x"}, {}])
def test_route_rejects_invalid_input(payload: dict) -> None:
    assert client.post("/api/v1/triage", json=payload).status_code == 422
