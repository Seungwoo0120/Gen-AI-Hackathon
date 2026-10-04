import asyncio
import json
from types import SimpleNamespace

import pytest

from app.config import Settings
from app.llm import get_extractor
from app.llm.base import ExtractionFailed
from app.llm.claude import ClaudeExtractor
from app.llm.gpt import OUTPUT_FORMAT, OpenAIExtractor
from app.llm.prompting import CHAT_RULES, SYSTEM_PROMPT
from app.llm.schemas import ChatTurn

EXTRACTION = {
    "symptoms": [{"name": "headache", "details": None, "severity": 3, "started_at": None}],
    "medications": [{"name": "Panadol", "dose": "2 tablets", "times": [], "notes": None}],
}


def message(*texts):
    parts = [SimpleNamespace(type="output_text", text=text) for text in texts]
    return SimpleNamespace(type="message", content=parts)


class FakeResponses:
    def __init__(self, output=(), error=None):
        self.output, self.error, self.calls = list(output), error, []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return SimpleNamespace(output=self.output)


def extractor(responses):
    return OpenAIExtractor(SimpleNamespace(responses=responses), model="test-model")


def run(coro):
    return asyncio.run(coro)


def test_sends_prompt_schema_and_no_storage() -> None:
    responses = FakeResponses([message(json.dumps(EXTRACTION))])
    drafts = run(extractor(responses).extract("Headache, took 2 Panadol", "en"))

    assert [(s.name, s.severity) for s in drafts.symptoms] == [("headache", 3)]
    assert [m.name for m in drafts.medications] == ["Panadol"]
    call = responses.calls[0]
    assert call["model"] == "test-model"
    assert call["instructions"] == SYSTEM_PROMPT
    assert call["text"] == {"format": OUTPUT_FORMAT}
    assert call["store"] is False
    assert "<message>\nHeadache, took 2 Panadol\n</message>" in call["input"]


def test_chat_uses_chat_rules_and_answers_only_guard() -> None:
    output = {**EXTRACTION, "medications": [{**EXTRACTION["medications"][0], "name": "medicine"}]}
    responses = FakeResponses([message(json.dumps(output))])
    turns = [ChatTurn(answer="headache"), ChatTurn(question="ask_medications", answer="no")]

    drafts = run(extractor(responses).extract_chat(turns, "en"))

    assert responses.calls[0]["instructions"] == SYSTEM_PROMPT + "\n" + CHAT_RULES
    # "medicine" appears only in the app's question.
    assert drafts.medications == []


def test_extra_message_item_is_skipped() -> None:
    reasoning = SimpleNamespace(type="reasoning", content=None)
    responses = FakeResponses(
        [reasoning, message("Sure, here it is:"), message(json.dumps(EXTRACTION))]
    )
    assert [
        s.name for s in run(extractor(responses).extract("headache Panadol", None)).symptoms
    ] == ["headache"]


def test_no_valid_json_fails() -> None:
    with pytest.raises(ExtractionFailed):
        run(extractor(FakeResponses([message("not json")])).extract("x", None))


def test_api_errors_are_wrapped() -> None:
    with pytest.raises(ExtractionFailed):
        run(extractor(FakeResponses(error=TimeoutError())).extract("x", None))


def test_schema_is_strict_everywhere() -> None:
    schema = OUTPUT_FORMAT["schema"]
    objects = [schema, *schema["$defs"].values()]
    assert all(item["additionalProperties"] is False for item in objects)
    assert all(set(item["required"]) == set(item["properties"]) for item in objects)


# --- provider selection ---


def test_openai_provider_uses_luna_by_default() -> None:
    settings = Settings(_env_file=None, data_source="live", llm_provider="openai", llm_api_key="k")
    chosen = get_extractor(settings)
    assert isinstance(chosen, OpenAIExtractor)
    assert chosen._model == "gpt-6-luna"


def test_model_setting_overrides_the_default() -> None:
    settings = Settings(
        _env_file=None, data_source="live", llm_provider="openai", llm_api_key="k", llm_model="x"
    )
    assert get_extractor(settings)._model == "x"


def test_anthropic_stays_the_default_provider() -> None:
    settings = Settings(_env_file=None, data_source="live", llm_api_key="k")
    assert isinstance(get_extractor(settings), ClaudeExtractor)


# --- real SDK, fake network ---


def test_real_sdk_with_fake_transport() -> None:
    import httpx2 as httpx
    from openai import AsyncOpenAI

    sent = {}

    def handler(request: httpx.Request) -> httpx.Response:
        sent.update(json.loads(request.content))
        output = {
            "symptoms": [{"name": "頭痛", "details": None, "severity": None, "started_at": None}],
            "medications": [{"name": "必理痛", "dose": "2 粒", "times": [], "notes": None}],
        }
        return httpx.Response(
            200,
            json={
                "id": "resp_test",
                "object": "response",
                "created_at": 0,
                "status": "completed",
                "model": sent["model"],
                "output": [
                    {
                        "id": "msg_test",
                        "type": "message",
                        "role": "assistant",
                        "status": "completed",
                        "content": [
                            {
                                "type": "output_text",
                                "text": json.dumps(output, ensure_ascii=False),
                                "annotations": [],
                            }
                        ],
                    }
                ],
                "parallel_tool_calls": True,
                "tool_choice": "auto",
                "tools": [],
            },
        )

    sdk = AsyncOpenAI(
        api_key="test", http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler))
    )
    drafts = run(OpenAIExtractor(sdk, "gpt-test").extract("頭痛，食咗兩粒必理痛", "zh-Hant"))

    assert sent["text"]["format"]["type"] == "json_schema"
    assert sent["store"] is False
    assert [s.name for s in drafts.symptoms] == ["頭痛"]
    assert [m.name for m in drafts.medications] == ["必理痛"]
