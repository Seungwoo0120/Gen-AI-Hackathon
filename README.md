# HK Health Companion

A voice-first health companion for older people in Hong Kong and the people who care
for them. Talk to it in Cantonese or English, and it:

1. **Writes down how you feel**, by asking a few short follow-up questions, and turns
   it into a one-page summary to show your doctor.
2. **Keeps your medicine list**, with warnings about drug interactions and the same
   ingredient under two brand names (e.g. Panadol + Panadol Cold & Flu), from a
   curated, sourced dataset.
3. **Tells you where to go**: GP, A&E or call 999, and which A&E you can reach and be
   seen at the soonest, using live Hospital Authority waiting times.

**It organises and routes; it never diagnoses.** Anything that sounds like an
emergency shows "Call 999" first, before anything else.

## Screens

| Screen | What it does |
|---|---|
| `/chat` | Tap the mic and talk (or type). The app asks up to four fixed follow-up questions (what, since when, how bad, which medicines) and reads them aloud. You check and correct what it understood before anything is saved. |
| `/medications` | Add, edit and delete medicines with times and days. Interaction and duplicate-ingredient warnings, each with its source, can be read aloud. |
| `/care` | "Where should I go?": a rule-based care level (call 999 / A&E / GP / specialist). When it is A&E, the fastest A&E by travel + waiting time. Below: live A&E waiting times. |
| `/summary` | A printable summary for the doctor: medicines, warnings and symptoms for the last 7 or 30 days. |

Everything is in English and Traditional Chinese (Cantonese), and works on a phone.

## Where AI is used, and where it is not

| Step | How | Why |
|---|---|---|
| Understanding what you said | LLM (OpenAI GPT-6 Luna or Claude, switchable) turns free speech into structured symptoms and medicines | People don't speak in forms |
| Follow-up questions | Fixed, translated questions chosen by rules; never written by the AI | Predictable, polite, safe to read aloud |
| Emergency detection | Rules (`services/api/app/routing/rules.yaml`), checked on every answer | Must never depend on an AI being right |
| Drug warnings | Curated dataset with a source for every entry | An AI must not invent a warning |
| Which A&E | Live HA waiting times + travel time, lowest total wins (a Claude tool-use agent, or the same calculation without an LLM) | Rules decide *whether* A&E first; the agent only compares hospitals, and never sees symptoms |

Speech recognition and read-aloud use the browser's built-in speech service (Web
Speech API; on Android Chrome that is Google's). Our server only receives the text.

## Try it

You need Node.js 24+ and Python 3.11+.

```bash
cp .env.example .env              # works as is: DATA_SOURCE=mock, no keys needed

# Backend
cd services/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python -m scripts.seed_demo       # optional: a made-up person's records
uvicorn app.main:app --reload     # http://localhost:8000/docs

# Frontend (another terminal)
cd apps/web
npm install
npm run dev                       # http://localhost:3000
```

**Mock mode** (default) runs fully offline: fake A&E data, fixed travel times, and a
simple keyword extractor instead of the LLM.

**Live mode** uses real data. In `.env`:

```bash
DATA_SOURCE=live
LLM_PROVIDER=openai               # or anthropic
LLM_API_KEY=...
GOOGLE_MAPS_API_KEY=              # optional; without it travel time is estimated
                                  # from OpenStreetMap and distance
```

**On a phone.** Speech recognition needs HTTPS. Run a production build
(`npm run build && npx next start`) and a tunnel such as
`cloudflared tunnel --url http://localhost:3000`, then open the tunnel URL on the
phone. The phone only talks to Next.js; Next.js calls the API.

## Demo script

1. `/chat`: tap the mic and say *"My left knee has hurt since last week, it's hard to
   walk. I take Panadol for it."* Answer the follow-up questions, check the cards,
   save.
2. `/medications`: add *Panadol Cold & Flu*. A duplicate-paracetamol warning appears,
   with its source.
3. `/care`: *"I fell and I think I broke my wrist"* + *"Kennedy Town MTR"* → "Go to
   A&E" and the fastest A&E.
4. `/summary`: the one-page summary for the doctor. Print it.
5. Safety: say *"I have chest pain"* in `/chat` or `/care`. The app shows "Call 999"
   first and stops.

## Not built yet

- Medication reminders (notifications). Times are recorded, but nothing alerts you.
- Accounts: one local database, one person.
- The Chinese text and the Cantonese emergency patterns still need a native
  speaker's review (`docs/cantonese-review.md`).
- The A&E agent's recommendation is in English only.

## Repository

```
apps/web/          Next.js frontend (TypeScript): screens, i18n, speech
services/api/      FastAPI backend (Python): chat, routing rules, interactions, A&E, triage
packages/shared/   OpenAPI contract (openapi.yaml); frontend types are generated from it
tools/             Standalone Google Maps travel-time tool
docs/              Team, progress log, review lists
```

Checks (CI runs the same on every pull request):

```bash
cd apps/web && npm run lint && npm run typecheck && npm test
cd services/api && ruff check . && ruff format --check . && pytest
```

Project rules for people and coding agents: [CLAUDE.md](CLAUDE.md). Team and
ownership: [docs/team.md](docs/team.md). Progress log: [docs/progress.md](docs/progress.md).

All health data in this repository is invented. This is a student prototype and not
medical advice.
