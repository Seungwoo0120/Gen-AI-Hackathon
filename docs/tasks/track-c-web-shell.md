# Track C: Frontend app shell

Branch: `feat/<name>-web-shell`

## Goal

Build the mobile-first app shell that every feature screen will live in: layout,
navigation, language switching, the safety components, and PWA basics. Screens are
placeholders; the only real data is the A&E list.

## Files you may change

- `apps/web/` only. Do not edit `lib/api/schema.ts` (generated) or anything outside `apps/web/`.

## Read first

Next.js here is newer than your training data. Read the relevant guides in
`apps/web/node_modules/next/dist/docs/` before writing code (App Router, layouts,
metadata/manifest, cookies, server and client components), and heed deprecation notices.

## Requirements

1. Layout and navigation
   - Mobile-first layout, readable for elderly users: base font ≥ 18px, tap targets
     ≥ 44px, high contrast, no hover-only interactions.
   - Bottom navigation with four sections: Chat (`/chat`), Medications (`/medications`),
     Find care (`/care`), Summary (`/summary`). Mark the current page with `aria-current`.
   - Placeholder pages for each section, showing the translated title and a
     "coming soon" line.
2. Language
   - Languages come from `lib/i18n` (`en`, `zh-Hant`). Add every new string there in
     both languages. No text inline in components.
   - Add a language switcher that stores the choice in a `lang` cookie. Server
     components read it. Set `<html lang>` accordingly (`en` / `zh-Hant`).
   - Mark new Chinese strings for native review with a comment in `zh-Hant.ts`.
3. Safety components (in `components/`)
   - `EmergencyBanner`: prominent "Call 999" with a `tel:999` link, rendered as
     the first thing on the page when shown. Takes no data; the parent decides when to show it.
   - `MedicalDisclaimer`: short "This is not medical advice" notice. Show it on `/care`,
     `/chat` and `/summary`.
4. Find care page (`/care`)
   - Fetch `GET /ae/wait-times` with the typed client in `lib/api/client.ts`.
   - List the hospitals with the name in the current language, the wait text, and the
     update time. Show a notice when `stale` is true.
   - Handle loading and error states. The backend route may not exist yet; the error
     state must look deliberate, not broken.
   - Show `EmergencyBanner` at the top of this page at all times.
5. PWA basics
   - A web app manifest (name, short name, theme color, `display: standalone`) and
     simple icons. No service worker yet.

## Tests

- Unit tests (vitest) for any logic you add, e.g. reading the `lang` cookie value
  with a fallback to `en` for unknown values.
- `i18n.test.ts` must still pass (every key in both languages, no empty strings).
- If you add component tests, add only `@testing-library/react` and `jsdom`, and say
  why in the PR.

## Out of scope

Chat UI, medication forms, the summary content, care routing questions, reminders,
notifications, and service workers.

## Done when

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass in `apps/web`.
- Every page is usable at 375px width and at 200% browser zoom.
