"""External data sources (HA A&E, drug data, maps).

Pattern for every source:
- `<source>/base.py`: a `typing.Protocol` describing what the app needs.
- `<source>/mock.py`: deterministic fake data; used by tests and when
  `settings.data_source == "mock"` (the default).
- `<source>/live.py`: the real HTTP client, cached where the source requires it.
- A `get_<source>()` FastAPI dependency picks mock or live from settings,
  so tests can override it with `app.dependency_overrides`.
"""
