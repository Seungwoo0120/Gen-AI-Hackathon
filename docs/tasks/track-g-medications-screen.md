# Track G: Medications screen

Branch: `feat/<name>-medications-screen`

## Goal

Make `/medications` usable by an older person: see their medications, add, edit
and delete them, and see interaction warnings from the curated dataset.

## Files you may change

- `apps/web/app/medications/**`
- `apps/web/components/medications/**` (new)
- `apps/web/lib/medications/**` (new: pure helpers and their tests)
- The `medications` section of `apps/web/lib/i18n/en.ts` and `zh-Hant.ts` only

Nothing else: no `globals.css`, no shared components, no other i18n sections.

## Read first

- `apps/web/node_modules/next/dist/docs/` for Server Actions, forms and `revalidatePath`
  (Next.js here is newer than your training data).
- `packages/shared/openapi.yaml`: `/medications`, `/medications/{medicationId}`,
  `/interactions/check`.

## Requirements

1. Data
   - Call the backend only through the typed client `lib/api/client.ts`, from server
     components and Server Actions. Forms must work as plain HTML forms.
   - After a change, re-render with `revalidatePath("/medications")`.
2. List
   - Each medication shows its name, dose, times and days in plain words
     (e.g. "08:00, 20:00 · every day").
   - Empty state: a short line and a large "Add medication" button.
3. Add and edit (one form component for both)
   - Fields: name (required), dose, times (`<input type="time">`, add or remove
     rows, at least 0), days of week (checkboxes; none checked means every day), notes.
   - Validate on the server to the contract's limits. Show errors next to fields in
     plain language. Keep what the user typed when there is an error.
   - Edit uses `PUT` (full replace).
4. Delete
   - Needs a confirmation step built into the page (e.g. "Delete Panadol?" with
     Delete / Cancel buttons). Never use `window.confirm`.
5. Interaction warnings
   - Whenever there are 2 or more medications, call `POST /interactions/check` with
     all names and show the warnings above the list.
   - Per warning: severity (major warnings visually strongest), the medications
     involved, the summary in the current language (`getLocalizedText`), and source
     links. End with the line from the dataset; add no advice of your own.
   - Also list `unrecognized` names as "Not checked: …", so users know those
     medications were not checked.
   - Add `ReadAloudButton` (`components/ReadAloudButton.tsx`) to each warning.
   - Show `MedicalDisclaimer` on this page.
6. Styling and accessibility
   - Use a CSS module next to your components. The 18px base font, ≥ 44px tap
     targets, visible focus, labels on every input, and usable at 375px width and 200% zoom.
7. Errors
   - If the backend is unreachable, show a calm error with a retry link, like `/care` does.

## Tests (vitest)

- Pure helpers in `lib/medications/`: form data → `MedicationInput` (times, days,
  empty strings → null, validation errors), and schedule → display text in both languages.
- `i18n.test.ts` must still pass.

## Out of scope

Reminders and notifications, barcode scanning, voice input, and chat.

## Done when

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass, and you
have tried the flow against the running API (`uvicorn app.main:app` with mock data).
