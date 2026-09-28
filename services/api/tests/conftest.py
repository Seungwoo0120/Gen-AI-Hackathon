import os

# Tests must never touch the developer's database, .env values or live sources.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["DATA_SOURCE"] = "mock"


from collections.abc import Iterator  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402

from app.db import Base, get_session, make_engine  # noqa: E402
from app.main import app  # noqa: E402


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
