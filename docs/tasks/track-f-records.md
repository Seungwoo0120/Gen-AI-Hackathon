# Track F: Symptom and medication records

Branch: `feat/<name>-records`

## Goal

Implement persistent CRUD for symptom entries and medications as defined in
`packages/shared/openapi.yaml`:

- `GET /symptoms`, `POST /symptoms`, `DELETE /symptoms/{symptomId}`
- `GET /medications`, `POST /medications`, `PUT /medications/{medicationId}`,
  `DELETE /medications/{medicationId}`

## Files you may change

- `services/api/app/records/` (new package: SQLAlchemy models, data access)
- `services/api/app/routers/symptoms.py`, `services/api/app/routers/medications.py`
- `services/api/tests/test_records_*.py`

Nothing else.

## Requirements

1. Models (SQLAlchemy 2 typed `Mapped[...]` style, on `Base` from `app/db.py`):
   - `SymptomEntry`: id, name, details, severity, started_at, recorded_at,
     source (`chat` | `manual`), created_at.
   - `Medication`: id, name, dose, schedule (JSON column), notes, created_at.
   - IDs: random UUID strings.
   - Store timestamps timezone-aware. Return them as ISO 8601 with offset. Treat naive
     input as Hong Kong time (`Asia/Hong_Kong`).
2. Table creation: `init_db()` creates tables only for models already imported. Make
   sure `app/records/models.py` is imported when your routers load (import it in your
   router modules). Do not edit `main.py` or `db.py`.
3. Routes use `get_session` from `app/db.py`, and request/response models extend
   `ApiModel`, matching the contract's field names exactly (camelCase JSON).
   - `POST /symptoms`: `recordedAt` defaults to now. `source` is `manual` for this route.
     (Chat-created entries will pass `source="chat"` through a service function, not
     the HTTP API. Expose a `create_symptom(session, data, source)` function in
     `app/records/` for that.)
   - `GET /symptoms`: newest `recordedAt` first. `from` is inclusive, `to` exclusive.
   - `PUT /medications/{id}`: full replace of the input fields.
   - Unknown IDs → 404 with the contract's `Error` body.
   - Validation matches the contract: severity 1–5, schedule times `HH:MM`,
     `daysOfWeek` 1–7, and the length limits.
4. Privacy: never log names, details or notes. No real personal data in tests or seeds.

## Tests (all offline, in-memory DB)

- Use a fixture that creates the tables on a fresh in-memory engine and overrides
  `get_session` with `app.dependency_overrides`, so tests don't share state.
- Create/list/delete round trip for both resources.
- Date filters on `GET /symptoms` (inclusive from, exclusive to) and ordering.
- `PUT` replaces all fields, including clearing optional ones to `null`.
- 404 for unknown IDs on delete and update. 422 for invalid severity, a bad time
  format, and an empty name.
- Responses use camelCase keys (`recordedAt`, `createdAt`, `daysOfWeek`).

## Out of scope

`/summary`, `/extract`, reminders and notifications, auth, multiple users, and migrations.

## Done when

- `ruff check .`, `ruff format --check .` and `pytest` pass in `services/api`.
- `uvicorn app.main:app` starts on an empty `dev.db` and the endpoints work from `/docs`.
