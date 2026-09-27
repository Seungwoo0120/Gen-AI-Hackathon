# HK Health Companion

AI health companion for Hong Kong: symptom and medication logging, reminders and
interaction warnings, and care routing. It organizes and routes; it never diagnoses.
See [CLAUDE.md](CLAUDE.md) for project rules.

## Layout

```
apps/web/          Next.js frontend (TypeScript)
services/api/      FastAPI backend (Python 3.11+)
packages/shared/   OpenAPI contract (openapi.yaml)
```

## Prerequisites

- Node.js 24+ and npm
- Python 3.11+

## Setup

```bash
# Environment variables
cp .env.example .env            # backend values
# Next.js only reads env files from its own folder:
# put NEXT_PUBLIC_* values in apps/web/.env.local

# Frontend
cd apps/web
npm install
npm run dev                     # http://localhost:3000

# Backend (in another terminal)
cd services/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload   # http://localhost:8000/health
```

## Checks

```bash
# Frontend (apps/web)
npm run lint && npm run typecheck && npm test

# Backend (services/api, venv active)
ruff check . && ruff format --check . && pytest
```

CI runs the same checks on every pull request (`.github/workflows/ci.yml`).
