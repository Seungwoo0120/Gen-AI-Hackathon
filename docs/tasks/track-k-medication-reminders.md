# Track K: Medication reminders

Owner: Seungwoo · Branch: `feat/seungwoo-medication-reminders`

Start after track G (medications screen) is merged: both live in `app/medications/`.

## Goal

Help older users take their medicines on time, using the schedules already saved
with each medication (`schedule.times`, `schedule.daysOfWeek`). No contract or
backend change.

Real push notifications need a service worker, a push server and per-browser
permission flows, which is too much for now and unreliable on iPhone. Instead:

1. **Today view**: an at-a-glance list of today's doses.
2. **Calendar reminders**: add the schedule to the phone's own calendar, which
   already reminds reliably on iPhone and Android.

## Files you may change

- `apps/web/app/medications/**`
- `apps/web/components/medications/**`
- `apps/web/lib/medications/**`
- The `medications` section of `apps/web/lib/i18n/en.ts` and `zh-Hant.ts`

Nothing else.

## Requirements

1. Today view (top of `/medications`, or `/medications/today` linked from it)
   - List today's doses in Hong Kong time, ordered by time: time, medication name, dose.
     Respect `daysOfWeek` (1 = Monday … 7 = Sunday; null means every day).
   - Highlight the next upcoming dose. Past doses appear muted.
   - "Taken" toggle per dose, stored on the device only (`localStorage`, keyed by
     date + medication ID + time, wrapped in try/catch). Say on screen that it's
     saved on this phone only. (Saving to the server would need a contract change:
     ask Dowon first.)
   - `ReadAloudButton` that reads today's remaining doses.
   - Empty state: no schedules yet → a link to add times to a medication.
2. Calendar reminders
   - An "Add reminders to my calendar" button per medication and one for all.
   - It generates an `.ics` file (iCalendar, RFC 5545) with one recurring event per
     dose time: `RRULE:FREQ=WEEKLY;BYDAY=…` from `daysOfWeek` (or `FREQ=DAILY`), a
     `VALARM` at the event time, `TZID=Asia/Hong_Kong` with a `VTIMEZONE` block, a
     stable `UID` per medication + time, and the title "Take <name> <dose>".
   - Generate the text in a pure helper. Offer it as a file download from a Route
     Handler (`text/calendar`), so it opens in the phone's calendar app.
   - Short instructions: on iPhone, tap the file, then "Add All".
3. Accessibility: the 18px base font, ≥ 44px targets, toggles with clear labels and
   `aria-pressed`, usable at 375px and 200% zoom.

## Tests (vitest)

- Today's doses: the `daysOfWeek` filter, ordering, the next-dose choice around
  midnight, and Hong Kong timezone handling (use a fixed "now").
- `.ics` builder: required fields, CRLF line endings, line folding at 75 octets,
  escaping of `,` `;` `\`, daily versus weekly RRULE, and stable UIDs.
- `i18n.test.ts` must still pass.

## Also yours (separate PR, data only)

Review the interaction dataset (`services/api/app/interactions/data/interactions.yaml`):
check each entry against its source, flip `reviewed` to `true` only for entries you
checked, and consider adding common HK cold/flu combination products (each with a
real source). Leave Chinese names for the native reviewer (`docs/team.md`).

## Out of scope

Push notifications, service workers, server-side dose logs, refill reminders, and
voice input.

## Done when

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass. The
`.ics` file imports correctly into at least one real phone calendar (say which in
the PR).
