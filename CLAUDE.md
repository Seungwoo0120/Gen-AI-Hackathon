# CLAUDE.md

This file is the single source of truth for how we work in this repo.
All agents (Claude Code, Codex) and all teammates follow it.
Only edit rules here. AGENTS.md just points to this file.

## Project

AI health companion for Hong Kong. The app helps users (elderly people and their
caregivers, domestic helpers, non-Cantonese speakers) to:

1. Log symptoms and medications through casual conversation, and turn that into a
   clean summary they can show a doctor.
2. Get medication reminders, and warnings about drug interactions and duplicate
   ingredients.
3. Get routed to the right care option (GP, specialist, or A&E), using real-time
   Hospital Authority A&E waiting time data.

### Product principle: organize and route, never diagnose

- The app must NEVER state or suggest a diagnosis ("you probably have X").
- Care routing is rule-based guidance on where to go, not a medical judgement.
- Any screen that gives health guidance shows a short "not medical advice" notice.
- If user input suggests an emergency (e.g. chest pain, trouble breathing,
  stroke signs), always show "Call 999" first, before anything else.
- Drug interaction warnings come from our curated dataset, not from free-form LLM
  output. The LLM may explain a warning in plain language, but must not invent one.

## Tech stack

> Default choice. If the team changes it, update this section first.

- Monorepo
- Frontend: Next.js (TypeScript), mobile-friendly web app (PWA)
- Backend: FastAPI (Python 3.11+)
- Database: SQLite for development (Postgres later if needed)
- Shared API contract: OpenAPI spec in `packages/shared/`
- LLM: called only from the backend, never from the frontend

## Repository structure

```
apps/web/           Frontend (Next.js)
services/api/       Backend (FastAPI)
  app/adapters/     External data sources (HA A&E, drug data, maps)
  app/interactions/ Drug interaction dataset and checker
  app/llm/          LLM prompts and extraction pipeline
  tests/
packages/shared/    API contract (OpenAPI) and shared types
docs/               Architecture, decisions, meeting notes
```

## Commands

> Keep these accurate. Frontend commands run in `apps/web/`; backend commands run in
> `services/api/` with the venv active (`source .venv/bin/activate`).

- Install:
  - Frontend: `npm install`
  - Backend: `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements-dev.txt`
- Regenerate API types after changing `packages/shared/openapi.yaml`: `npm run gen:api`
  (in `apps/web/`; CI fails if `lib/api/schema.ts` is out of date)
- Run frontend: `npm run dev` (http://localhost:3000)
- Run backend: `uvicorn app.main:app --reload` (http://localhost:8000)
- Test:
  - Frontend: `npm test`
  - Backend: `pytest`
- Lint/format:
  - Frontend: `npm run lint && npm run typecheck`
  - Backend: `ruff check . && ruff format --check .` (auto-fix: `ruff check --fix . && ruff format .`)

## Git workflow

- Never commit or push to `main` directly. `main` is protected.
- Always branch from the latest `main`: `feat/<name>-<topic>` or `fix/<name>-<topic>`
  (e.g. `feat/dowon-ae-adapter`).
- One task per branch, one branch per PR. Keep PRs small.
- Before opening a PR: pull latest `main`, rebase, run tests and lint, fix failures.
- PRs are squash merged. After a merge, everyone pulls `main` again.
- Link each PR to its GitHub Issue.

## Working rules for agents

- Only modify files related to the current task. Do not refactor unrelated code.
- Next.js in `apps/web/` is newer than most model training data and has breaking
  changes. Before writing frontend code, read the relevant guide in
  `apps/web/node_modules/next/dist/docs/` and heed deprecation notices.
- Do NOT change `packages/shared/` (the API contract) unless the task explicitly
  says so. Contract changes must be announced to the team before merging.
- Do not add new dependencies without stating why in the PR description.
- Do not delete or rewrite tests to make them pass. Fix the code instead.
- If a task is unclear or conflicts with this file, stop and ask instead of guessing.
- When finishing a task, summarize: what changed, how to test it, what is left.

## External data

- Every external source goes behind an adapter interface in `app/adapters/`,
  with a mock implementation. The app must run fully on mocks.
- HA A&E waiting time: public JSON from data.gov.hk / ha.org.hk, updated every
  15 minutes. Cache it; do not call it on every request.
- Drug interactions: small curated local dataset (common HK medications) stored in
  `app/interactions/`. Each entry includes a source reference.

## Code conventions

- TypeScript: strict mode, no `any` unless justified in a comment.
- Python: type hints everywhere, format with the project formatter.
- Name things clearly; comments explain why, not what.
- User-facing text goes through one place so we can add translations later
  (English, Traditional Chinese, and possibly Tagalog/Indonesian).

## Security and privacy

- Never commit secrets. Use `.env` (gitignored) and keep `.env.example` updated.
- Treat all health data as sensitive. No real user data in the repo; use fake
  seed data only.
- Do not log full symptom or medication text in plain logs.

## PR checklist

- [ ] Branched from latest `main` and rebased
- [ ] Tests and lint pass locally
- [ ] Only task-related files changed
- [ ] No secrets, no real personal data
- [ ] Description says what changed and how to test it