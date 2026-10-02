"""GenAI A&E routing agent: location -> fastest reachable A&E hospital.

The agent never sees symptoms, so it has nothing to diagnose from; emergency
detection stays rule-based in the router (app.routing.check_emergency).

Uses Claude's tool-use (function calling) to combine A&E wait time (the A&E
adapter) and travel time (the maps adapter) into a "Total Time to Care", and
recommend the fastest option. Both adapters follow DATA_SOURCE, so mock mode
never touches the network. Without an LLM, MockTriageAgent does the same
calculation deterministically, the way app/llm/__init__.py does for chat
extraction.
"""

import json
import logging
from functools import lru_cache
from typing import Annotated, Any, Protocol

from fastapi import Depends
from starlette.concurrency import run_in_threadpool

from app.adapters.ae import get_ae_source
from app.adapters.ae.base import AeSourceUnavailable, AeWaitTimesSource
from app.adapters.maps import TravelMode, TravelTimeFn, TravelTimeUnavailable, get_travel_time
from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 6

TOOLS: list[dict[str, Any]] = [
    {
        "name": "get_nearest_hospital_wait_times",
        "description": (
            "Get current A&E (emergency department) waiting times at every Hong "
            "Kong public hospital. Takes no arguments. Always call this first."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "calculate_travel_time",
        "description": (
            "Estimate travel time in minutes from the patient's current location "
            "to one named hospital. Call this once per hospital you are "
            "considering (2-3 calls total), never for every hospital in the list."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "origin": {
                    "type": "string",
                    "description": "Patient's current location, e.g. an MTR station or address.",
                },
                "destination": {
                    "type": "string",
                    "description": (
                        "A hospital name exactly as returned by get_nearest_hospital_wait_times."
                    ),
                },
                "mode": {"type": "string", "enum": ["transit", "driving"]},
            },
            "required": ["origin", "destination", "mode"],
        },
    },
]

SYSTEM_PROMPT = """\
You are an A&E routing assistant for Hong Kong. You never diagnose and never \
name or imply any medical condition. Your only job is to recommend which A&E \
department the user can reach and be seen at the soonest, using real data \
from your tools.

You are given the user's current location. Work in these steps:
1. Call get_nearest_hospital_wait_times (no arguments) to see every hospital's \
current wait time.
2. Pick the 2-3 hospitals that look most promising (e.g. shortest wait, or a \
hospital you have reason to think is close). Call calculate_travel_time once \
for each of them, with mode "transit" unless the patient's message implies \
they are driving.
3. For each hospital you checked, compute:
   Total Time to Care = travel time (minutes) + wait time (minutes)
4. Recommend the hospital with the lowest Total Time to Care.

Never invent a wait time or travel time yourself -- only use numbers the tools \
returned. If a tool fails for a hospital, drop that hospital and continue with \
the others.

Your final reply must:
- Name the recommended hospital and its Total Time to Care, showing the travel \
time and wait time separately.
- Briefly name the other hospital(s) you checked and why they lost.
- Remind the user that if their condition is life-threatening, they should \
call 999 instead of travelling themselves.
- Never state or imply a diagnosis; you are only comparing travel and wait times.
"""


class TriageAgentError(RuntimeError):
    """The agent could not produce a final recommendation."""


class TriageAgent(Protocol):
    async def recommend(self, location: str) -> str: ...


class _ToolUseBlock(Protocol):
    name: str
    id: str
    input: dict[str, Any]


async def _wait_times(ae_source: AeWaitTimesSource) -> list[dict[str, Any]]:
    response = await ae_source.get_wait_times()
    return [
        {"name": h.name.en, "wait_text": h.wait_time_text.en, "wait_minutes": h.wait_minutes}
        for h in response.hospitals
    ]


def _final_text(content: list[Any]) -> str:
    texts = [block.text for block in content if block.type == "text"]
    return "\n".join(texts).strip()


class _MessagesApi(Protocol):
    async def create(self, **kwargs: object) -> object: ...


class _AnthropicLike(Protocol):
    @property
    def messages(self) -> _MessagesApi: ...


class ClaudeTriageAgent:
    """Runs Claude's tool-use loop: it decides which tools to call and when to stop."""

    def __init__(
        self,
        client: _AnthropicLike,
        model: str,
        ae_source: AeWaitTimesSource,
        travel_time: TravelTimeFn,
    ) -> None:
        self._client = client
        self._model = model
        self._ae_source = ae_source
        self._travel_time = travel_time

    async def _run_tool(self, block: _ToolUseBlock) -> dict[str, Any]:
        name = block.name
        try:
            if name == "get_nearest_hospital_wait_times":
                result: Any = await _wait_times(self._ae_source)
            elif name == "calculate_travel_time":
                # The live client is blocking HTTP; keep it off the event loop.
                minutes = await run_in_threadpool(self._travel_time, **block.input)
                result = {"travel_minutes": minutes}
            else:
                result = {"error": f"Unknown tool: {name}"}
        except TravelTimeUnavailable as error:
            result = {"error": str(error)}
        except Exception as error:  # a bad tool call must not crash the whole loop
            logger.warning("Tool %s failed: %s", name, type(error).__name__)
            result = {"error": "Tool call failed"}
        return {"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result)}

    async def recommend(self, location: str) -> str:
        messages: list[dict[str, Any]] = [
            {"role": "user", "content": f"Current location: {location}"}
        ]

        for _ in range(MAX_TOOL_ROUNDS):
            try:
                response = await self._client.messages.create(
                    model=self._model,
                    max_tokens=1024,
                    system=SYSTEM_PROMPT,
                    tools=TOOLS,
                    messages=messages,
                )
            except Exception as error:
                raise TriageAgentError(type(error).__name__) from error

            content = response.content
            messages.append({"role": "assistant", "content": content})

            if response.stop_reason != "tool_use":
                text = _final_text(content)
                if not text:
                    raise TriageAgentError("Model returned no text")
                return text

            tool_results = [
                await self._run_tool(block) for block in content if block.type == "tool_use"
            ]
            messages.append({"role": "user", "content": tool_results})

        raise TriageAgentError("Exceeded tool-call limit without a final answer")


class MockTriageAgent:
    """No LLM call -- computes Total Time to Care directly from the same adapters.

    Used when DATA_SOURCE=mock or no LLM_API_KEY, so /api/v1/triage works offline.
    """

    DEFAULT_MODE: TravelMode = "transit"
    TOP_N = 3

    def __init__(self, ae_source: AeWaitTimesSource, travel_time: TravelTimeFn) -> None:
        self._ae_source = ae_source
        self._travel_time = travel_time

    async def recommend(self, location: str) -> str:
        try:
            all_hospitals = await _wait_times(self._ae_source)
        except AeSourceUnavailable:
            all_hospitals = []
        hospitals = [h for h in all_hospitals if h["wait_minutes"] is not None]
        if not hospitals:
            return "No hospital wait-time data is available right now."
        shortlist = sorted(hospitals, key=lambda h: h["wait_minutes"])[: self.TOP_N]

        scored: list[tuple[str, float, float]] = []
        for hospital in shortlist:
            try:
                travel_minutes = await run_in_threadpool(
                    self._travel_time, location, hospital["name"], self.DEFAULT_MODE
                )
            except TravelTimeUnavailable:
                continue
            scored.append((hospital["name"], travel_minutes, hospital["wait_minutes"]))

        if not scored:
            fastest = shortlist[0]
            return (
                "Could not estimate travel time right now. By wait time alone, "
                f"{fastest['name']} has the shortest wait ({fastest['wait_minutes']:.0f} min)."
            )

        scored.sort(key=lambda row: row[1] + row[2])
        lines = []
        for index, (name, travel, wait) in enumerate(scored):
            total = travel + wait
            label = "Recommended" if index == 0 else "Also considered"
            lines.append(
                f"{label}: {name} -- {travel:.0f} min travel + {wait:.0f} min wait "
                f"= {total:.0f} min total."
            )
        lines.append("If this is life-threatening, call 999 instead of travelling yourself.")
        return "\n".join(lines)


@lru_cache
def _anthropic_client(api_key: str) -> _AnthropicLike:
    from anthropic import AsyncAnthropic

    return AsyncAnthropic(api_key=api_key, timeout=30, max_retries=1)


def get_triage_agent(
    settings: Annotated[Settings, Depends(get_settings)],
    ae_source: Annotated[AeWaitTimesSource, Depends(get_ae_source)],
    travel_time: Annotated[TravelTimeFn, Depends(get_travel_time)],
) -> TriageAgent:
    # The agent's tool loop is written for the Anthropic API. With another provider the
    # deterministic agent does the same calculation on the same live data.
    if settings.data_source == "live" and settings.llm_provider == "anthropic":
        if settings.llm_api_key:
            client = _anthropic_client(settings.llm_api_key)
            return ClaudeTriageAgent(
                client, settings.resolved_llm_model, ae_source, travel_time
            )
        logger.warning("DATA_SOURCE=live but LLM_API_KEY is empty; using the mock triage agent")
    return MockTriageAgent(ae_source, travel_time)


async def process_patient_query(location: str) -> str:
    """Entry point for the agentic workflow outside FastAPI's DI, e.g. from a script."""
    settings = get_settings()
    agent = get_triage_agent(settings, get_ae_source(settings), get_travel_time(settings))
    return await agent.recommend(location)
