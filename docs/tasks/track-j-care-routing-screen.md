# Track J: Care routing screen

Owner: Jinuk · Branch: `feat/jinuk-care-routing-screen`

## Goal

Turn `/care` into "Where should I go?": the user describes how they feel and gets
rule-based guidance (call 999 / A&E / GP), never a diagnosis, followed by live A&E
waiting times when A&E is the answer.

## Files you may change

- `apps/web/app/care/**`
- `apps/web/components/care/**` (new)
- `apps/web/lib/care/**` (new: pure helpers and their tests)
- The `care` and `careLevel` sections of `apps/web/lib/i18n/en.ts` and `zh-Hant.ts`
- `apps/web/components/EmergencyBanner.tsx`: only the accessibility fix in step 5

Nothing else: no `globals.css`, no other screens or i18n sections, no backend.

## Read first

- `apps/web/node_modules/next/dist/docs/` for Server Actions, forms and search params
  (Next.js here is newer than your training data).
- `packages/shared/openapi.yaml`: `POST /routing/assess` (`RoutingRequest`,
  `RoutingResult`, `CareLevel`) and `GET /ae/wait-times`.
- `services/api/app/routing/rules.yaml`: the rule IDs (reason codes) and the
  safety design notes at the top.

## Requirements

1. Ask
   - A large text box "How do you feel?" with an optional age field and a big
     "Get guidance" button. It must work as a plain HTML form (Server Action calling
     `POST /routing/assess` through `lib/api/client.ts`, with `lang` set to the current language).
   - Leave space above the text box for a microphone button: Dowon's voice input
     component will be added there later. Do not build voice input.
2. Result, in this order
   - If `emergency` is true: the result starts with a large "Call 999 now" block with a
     `tel:999` link, before anything else on the screen, including the A&E list.
   - The care level as a large card, using the `careLevel` texts.
   - "Why": each reason code shown as a translated plain-language phrase
     (`care.reasons.<code>`), e.g. `chest_pain` → "You mentioned chest pain".
     Describe what the user said, never what it might mean.
   - `gp`: a short note that a GP (family doctor) can assess and refer to a
     specialist if needed. No list of clinics is required.
   - `ae`: show the A&E waiting time list below the result.
   - Always show `MedicalDisclaimer` with the result.
   - Keep the user's text in the box so they can edit and ask again.
3. Reason translations
   - Add a translation for every rule ID in `rules.yaml` (16 today) in both languages.
   - Unknown codes (rules added later) fall back to a generic phrase; never show raw codes.
4. A&E list (already on this page)
   - Label the wait time clearly: "Most non-urgent patients are seen within X".
     The value is HA's 95th percentile for triage IV/V patients.
   - Add a one-line note: urgent cases are seen first, so the wait does not apply
     to emergencies.
   - Keep the existing loading, stale and error states.
5. EmergencyBanner accessibility fix
   - The always-visible banner uses `role="alert"`, so screen readers announce it on
     every page load. Change it to a labelled region (`<aside aria-labelledby=…>`
     without `role="alert"`). Use `role="alert"` only for the emergency result in step 2,
     which appears in response to the user.
6. Accessibility and layout: the 18px base font, ≥ 44px tap targets, a label on
   every input, the result announced to screen readers (`aria-live="polite"`, or
   `alert` for emergencies), and usable at 375px and 200% zoom.

## Tests (vitest)

- Every rule ID in `services/api/app/routing/rules.yaml` has a reason translation in
  both languages (read the file and extract `- id:` lines with a regex; no new
  YAML dependency).
- The unknown reason code fallback.
- The function that orders the result blocks: emergency first, whatever the input.
- `i18n.test.ts` must still pass.

## Also yours (separate PR, data only)

Review `services/api/app/routing/rules.yaml`: for each rule, check the care level
against its NHS source and the English patterns for obvious gaps. Flip `reviewed` to
`true` only for rules you checked. Leave Chinese patterns for the native reviewer
(`docs/team.md`).

## Out of scope

Voice input, maps, distance to hospitals, a GP clinic directory, and backend changes.

## Done when

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass. You have
tried, against the running API (mock data): "chest pain" (999 first), "I hit my
head" (A&E + list), "mild cough" (GP), in both languages.
