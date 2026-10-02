# Track H: Doctor summary screen

Branch: `feat/<name>-summary-screen`

Start after `GET /summary` is on `main` (PR "Integration 1: doctor summary").

## Goal

Make `/summary` a single clear page the user can show or print for a doctor: their
own records, organized, with no interpretation.

## Files you may change

- `apps/web/app/summary/**`
- `apps/web/components/summary/**` (new)
- `apps/web/lib/summary/**` (new: pure helpers and their tests)
- The `summary` section of `apps/web/lib/i18n/en.ts` and `zh-Hant.ts` only

Nothing else: no `globals.css`, no shared components, no other i18n sections.

## Read first

- `apps/web/node_modules/next/dist/docs/` for search params in pages and CSS modules.
- `packages/shared/openapi.yaml`: `GET /summary` (`DoctorSummary`).

## Requirements

1. Date range
   - Choices: last 7 days, last 30 days (default), everything. Store the choice in
     the URL (`?range=7d|30d|all`) so it survives reloads; unknown values → 30d.
   - Compute `from` in Hong Kong time. `to` is omitted (up to now).
2. Content, in this order
   - Header: app name, "Summary for your doctor", the range in words, and
     `generatedAt` formatted in Hong Kong time.
   - Medications: name, dose, schedule in plain words.
   - Interaction warnings (if any): severity, the medications involved, the curated
     summary in the current language, and sources.
   - Symptoms, newest first: date and time, name, severity as "3 / 5", details.
     Mark entries from chat as such only if it helps the doctor (e.g. a small "via chat").
   - Show `MedicalDisclaimer`.
   - Never add interpretation, trends or advice. Show only what was recorded.
3. Print
   - A large "Print" button (client component calling `window.print()`).
   - Print styles in your CSS module under `@media print`: hide the bottom
     navigation, language switcher, buttons and the emergency banner (use
     `:global(...)` for layout classes), use black text on white, avoid breaking a
     medication or symptom across pages, and fit on A4.
4. Read aloud
   - A `ReadAloudButton` that reads a short plain-text version of the summary
     (counts plus the medication names). Build that text in a pure helper.
5. Empty and error states
   - No records in the range: say so, and link to Chat and Medications.
   - Backend unreachable: a calm error with a retry link, like `/care`.
6. Accessibility: the 18px base font, ≥ 44px tap targets, proper headings (h1 → h2),
   and usable at 375px and 200% zoom.

## Tests (vitest)

- Range parsing and `from` computation (Hong Kong time, unknown value → 30d).
- The read-aloud text builder in both languages.
- `i18n.test.ts` must still pass.

## Out of scope

PDF export, sharing links, charts, and editing records from this page.

## Done when

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass. You have
checked the page and its print preview against the running API with a few
symptoms and medications added.
