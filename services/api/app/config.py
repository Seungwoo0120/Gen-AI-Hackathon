from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Monorepo root, so one .env serves the whole project.
REPO_ROOT = Path(__file__).resolve().parents[3]

DEFAULT_LLM_MODELS = {"anthropic": "claude-opus-5-5", "openai": "gpt-6-luna"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./dev.db"
    # "mock" runs every external source on its mock adapter, so the app works offline.
    data_source: Literal["mock", "live"] = "mock"
    cors_origins: list[str] = ["http://localhost:3000"]
    # Chat extraction runs on the LLM only when data_source == "live".
    llm_provider: Literal["anthropic", "openai"] = "anthropic"
    # The key for llm_provider.
    llm_api_key: str = ""
    # Empty means the provider's default (DEFAULT_LLM_MODELS).
    llm_model: str = ""

    @property
    def resolved_llm_model(self) -> str:
        return self.llm_model or DEFAULT_LLM_MODELS[self.llm_provider]


@lru_cache
def get_settings() -> Settings:
    return Settings()
