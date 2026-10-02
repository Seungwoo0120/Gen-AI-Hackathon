# Team and ownership

Four people: three developers who each own one feature end to end (screens, API
wiring, data review and the demo scenario for that feature), and one owner of the
report, pitch and business case. Ownership means you decide and you review; anyone
may help.

| Feature | Owner | Owns |
|---|---|---|
| ① Log by conversation → doctor summary | Dowon | Voice-first chat (`/chat` screen, chat API), `/extract`, `/summary` and the summary screen (track H) |
| ② Medications: reminders and interaction warnings | Seungwoo | Medications screen (track G), reminders (track K), interaction dataset review and expansion |
| ③ Care routing and A&E waiting times | Jinuk | Care routing screen (track J), routing rules review, A&E data |
| Report, pitch and business model | Siddhant | Written report, presentation, business model, the final demo script |

Shared owner roles:

- **API contract (`packages/shared/openapi.yaml`): Dowon.** Ask Dowon for contract
  changes; only one person edits the contract, to avoid conflicting versions.
  Announce every contract change in the team chat before merging.
- **Demo and pitch: Siddhant leads.** Each developer prepares and presents the demo
  scenario for their feature (see "Demo flow" below). Siddhant combines them into
  one story.
- **Progress for the report.** When a PR merges, its author adds one line to
  `docs/progress.md` (what now works, in plain English), and notes any new
  challenge. Siddhant takes the report's progress and challenges sections from
  there, so nobody has to reconstruct them later.

## Working together

- Tracks and briefs live in [`docs/tasks/`](tasks/README.md). Follow CLAUDE.md for
  branching, PRs and checks.
- **Review rotation.** Every PR gets one review from another person before merging:
  Dowon → Seungwoo → Jinuk → Dowon (you review the next person's PRs).
  Agent-written code (Codex, Claude) always gets a human review that includes
  running it, not just reading the diff.
- **Before merging:** CI is green, the reviewer approved, and squash merge.
- **Safety content is owned, not guessed.** The owner checks that every
  safety-relevant entry has a real source and a sensible level:
  - Routing rules (`services/api/app/routing/rules.yaml`): Jinuk.
  - Interaction dataset (`services/api/app/interactions/data/`): Seungwoo.
  Flip `reviewed: false` to `true` only after checking an entry against its source.
  If unsure, leave it `false` and say so in the PR.

## Cantonese and Traditional Chinese

None of us speaks Cantonese, so we can't judge the Chinese text or the Cantonese
emergency phrases ourselves.

- **Find one native reviewer (action item: everyone).** A classmate or friend from
  Hong Kong reviews, in one sitting: `apps/web/lib/i18n/zh-Hant.ts`, the `zh`
  patterns in `rules.yaml`, and the Chinese drug names in the interaction dataset.
  Keep a list of everything waiting for that review in `docs/cantonese-review.md`.
- Until then, every Chinese string stays marked "needs native review".
- **Voice input in Cantonese** depends on the phone test (`/voice-test`). Plan the
  demo so it still works in English if Cantonese recognition is weak.

## Demo flow (target)

One story across the three features, each owner presenting their part:

1. ① An older user taps the mic and describes how they feel (Dowon).
2. ③ No emergency, so the app routes them to the right care, with live A&E
   waiting times (Jinuk).
3. ② They mention their medicines; the app warns about a duplicate ingredient
   and sets up reminders (Seungwoo).
4. ① A one-page summary to show the doctor (Dowon).
5. Safety moment: saying "chest pain" shows "Call 999" first, on any screen.
