from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Monorepo root, so one .env serves the whole project.
REPO_ROOT = Path(__file__).resolve().parents[3]


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
    llm_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
