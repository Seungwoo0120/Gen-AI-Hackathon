"""Keep the backend in line with packages/shared/openapi.yaml.

Routes may be added to the spec before they are implemented, but the backend
must never expose a route the spec does not define.
"""

from pathlib import Path

import yaml
from fastapi.routing import APIRoute
from openapi_spec_validator import validate

from app.main import app

SPEC_PATH = Path(__file__).resolve().parents[3] / "packages" / "shared" / "openapi.yaml"
HTTP_METHODS = {"get", "post", "put", "patch", "delete"}


def load_spec() -> dict:
    return yaml.safe_load(SPEC_PATH.read_text())


def test_spec_is_valid_openapi() -> None:
    validate(load_spec())


def test_every_backend_route_is_in_spec() -> None:
    spec_paths = load_spec()["paths"]
    spec_routes = {
        (method.upper(), path)
        for path, item in spec_paths.items()
        for method in item
        if method in HTTP_METHODS
    }
    # Built-in docs routes are excluded because they are not APIRoute instances.
    backend_routes = {
        (method, route.path)
        for route in app.routes
        if isinstance(route, APIRoute)
        for method in route.methods
        if method.lower() in HTTP_METHODS
    }
    missing = sorted(backend_routes - spec_routes)
    assert not missing, f"Routes not in openapi.yaml: {missing}"
