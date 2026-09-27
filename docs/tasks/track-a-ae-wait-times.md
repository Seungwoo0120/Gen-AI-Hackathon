# Track A: A&E wait times adapter

Branch: `feat/<name>-ae-adapter`

## Goal

Implement `GET /ae/wait-times` as defined in `packages/shared/openapi.yaml`
(`AeWaitTimesResponse`, `AeHospitalWaitTime`), backed by Hospital Authority open data
with a mock for offline use.

## Files you may change

- `services/api/app/adapters/ae/` (new package)
- `services/api/app/routers/ae.py`
- `services/api/tests/test_ae_*.py` and `services/api/tests/fixtures/ae/`

Nothing else.

## Data source

Hospital Authority publishes A&E waiting times as public JSON, listed on
data.gov.hk ("Waiting time of Accident and Emergency Department") and served from
ha.org.hk, with English and Traditional Chinese versions. It updates about every 15 minutes.

Before writing the parser, fetch the current English and Chinese files once. Confirm
the real URL, field names and time format, and save both responses as fixtures under
`tests/fixtures/ae/`. Do not trust field names from memory. Record the URLs you used
and the date you fetched them in a comment in `live.py`.

## Requirements

1. Follow the adapter pattern in `app/adapters/__init__.py`:
   - `ae/base.py`: `AeWaitTimesSource` Protocol with one method returning the
     normalized response model.
   - `ae/mock.py`: deterministic data for at least 5 real HA hospitals with realistic
     wait texts, English and Chinese names.
   - `ae/live.py`: fetches both languages, merges them by hospital, and normalizes
     them to the contract shape.
   - `get_ae_source()` dependency: returns the mock when `settings.data_source == "mock"`,
     otherwise the live source.
2. Normalization:
   - `hospitalId`: stable lowercase slug derived from the English name
     (e.g. "Queen Mary Hospital" → `queen-mary-hospital`).
   - `waitTimeText`: HA's published text in both languages, unchanged.
   - `waitMinutes`: numeric estimate for sorting, derived from the text
     (e.g. "Around 2 hours" → 120, "Over 3 hours" → 180, "Within 15 minutes" → 15).
     Use `null` when the text cannot be parsed. Never guess.
   - `sourceUpdatedAt`: HA's update time as ISO 8601 with `+08:00`.
   - `district`: `null` unless the source provides it.
3. Caching (live source only):
   - Cache the normalized result in memory for 15 minutes.
   - If a refresh fails and cached data exists, return the cache with `stale: true`.
   - If a refresh fails and there is no cache, the route returns 503 with `Error`.
   - Use a 10 second HTTP timeout. Use `urllib.request` from the standard library
     (no new dependency), called in a thread (`run_in_threadpool`) so it doesn't
     block the event loop.
4. The route returns hospitals sorted by `waitMinutes` ascending, with `null` last.

## Tests (all offline)

- Parser: the saved fixtures produce the expected normalized hospitals, both languages.
- Wait text parsing: a table of known texts → minutes, and unknown text → `null`.
- Cache: a second call within 15 minutes doesn't refetch. A failure after a success
  returns `stale: true`. A failure with an empty cache → 503. Inject a fake fetch
  function and a fake clock; don't sleep.
- Route: with the mock source, `GET /ae/wait-times` returns 200 and camelCase JSON
  matching the contract's required fields.

## Out of scope

Maps, distance, hospital coordinates, and any frontend work.

## Done when

- `ruff check .`, `ruff format --check .` and `pytest` pass in `services/api`.
- The app still starts with `DATA_SOURCE=mock` and no network.
