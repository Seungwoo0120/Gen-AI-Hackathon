# Stage 2 task briefs

Parallel tracks that build on the API contract (`packages/shared/openapi.yaml`)
and the foundation code. Each track touches its own folder, so tracks can run at
the same time without merge conflicts.

| Track | Brief | Owner | Folders it may change |
|---|---|---|---|
| A | [A&E wait times adapter](track-a-ae-wait-times.md) | Codex | `services/api/app/adapters/ae/`, `app/routers/ae.py` |
| B | [Drug interaction dataset and checker](track-b-interactions.md) | Codex + human data review | `services/api/app/interactions/`, `app/routers/interactions.py` |
| C | [Frontend app shell](track-c-web-shell.md) | Codex | `apps/web/` |
| D | Care routing and emergency detection | Claude | `services/api/app/routing/`, `app/routers/routing.py` |
| E | LLM extraction pipeline | Claude | `services/api/app/llm/`, `app/routers/extract.py` |
| F | [Symptom and medication records](track-f-records.md) | Codex | `services/api/app/records/`, `app/routers/symptoms.py`, `app/routers/medications.py` |

Stage 3 screen tracks (each edits only its own screen folder and its own i18n section):

| Track | Brief | Owner | Folders it may change |
|---|---|---|---|
| G | [Medications screen](track-g-medications-screen.md) | Seungwoo | `apps/web/app/medications/`, `components/medications/`, `lib/medications/` |
| H | [Doctor summary screen](track-h-summary-screen.md) | Dowon | `apps/web/app/summary/`, `components/summary/`, `lib/summary/` |
| I | Voice-first chat screen and `/chat` API | Dowon (with Claude) | `apps/web/app/chat/`, chat API |
| J | [Care routing screen](track-j-care-routing-screen.md) | Jinuk | `apps/web/app/care/`, `components/care/`, `lib/care/` |
| K | [Medication reminders](track-k-medication-reminders.md) (after G) | Seungwoo | `apps/web/app/medications/`, `components/medications/`, `lib/medications/` |

Owners are people (see [`docs/team.md`](../team.md)); each may hand the brief to an
agent (Codex or Claude), but reviews and merges stay with people.

## How to start a track

Run one git worktree per track so agents never edit the same checkout:

```bash
git checkout main && git pull
git worktree add ../hk-<topic> -b feat/<name>-<topic>
cd ../hk-<topic>
# set up that worktree (see README "Setup"), then start the agent there
```

Prompt to give the agent:

> Read AGENTS.md and CLAUDE.md in full, then read `docs/tasks/<brief>.md`.
> Do exactly that task. Change only the files the brief allows. Do not change
> `packages/shared/`. Run the backend and frontend checks from CLAUDE.md until they
> pass. When done, summarize what changed, how to test it, and what is left.

When the agent finishes, review the diff, run the checks yourself, then open a PR.
Remove the worktree after merging: `git worktree remove ../hk-<topic>`.

## Rules for every track

- The contract is fixed. If a brief seems to need a contract change, stop and ask.
  Do not work around the contract.
- Use `ApiModel` (`app/schemas.py`) for every request and response model so JSON is
  camelCase. Field names must match `openapi.yaml` exactly.
- Fill in only your own `app/routers/<area>.py`. It is already registered in
  `app/main.py`; do not edit `main.py`.
- Avoid new dependencies. If one is truly needed, state why in the PR description.
- Tests must run offline. Use mocks and fixtures, never live network calls.
- Never log symptom or medication text.
- Frontend: put screen styles in a CSS module next to the screen; `globals.css` is
  for shared tokens and layout only. Add text only to your screen's i18n section.
- `tests/test_contract.py` must keep passing: every route you add must exist in
  `openapi.yaml` with the same method and path.
