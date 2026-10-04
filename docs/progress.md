# Progress log

For the report (Siddhant). One plain-English line per merged PR: what now works.
Add challenges as they come up. Newest first.

## Done

- 2026-10-04 · Voice chat screen: tap the big mic and talk (or type); the app asks short follow-up questions out loud, shows what it noted for the user to check and correct, and saves it to the doctor summary. Saying something like "chest pain" stops the chat and shows "Call 999" first.
- 2026-10-13 · Medications screen: people can add, edit and confirm deletion of medicines, record times and days, and read or hear sourced interaction warnings in English or Traditional Chinese. Form inputs survive validation and service errors, including without JavaScript.
- 2026-10-03 · The AI model is now switchable (Claude or OpenAI). On 11 made-up test cases (English, Cantonese, a prompt-injection attempt), OpenAI's GPT-6 Luna got 34 of 35 checks right in about 3 seconds, at roughly a tenth of the price of the cheapest Claude model.
- 2026-10-03 · Conversation API: the app asks up to four short follow-up questions (what, since when, how bad, which medicine) until the record is complete. The questions are fixed and translated, never written by the AI, and every answer is checked for emergencies.
- 2026-10-03 · Voice tested on a real Android phone (Samsung Galaxy): Cantonese speech recognition was accurate on all test sentences, and read-aloud uses a real Cantonese voice. Fixed three Android-specific issues found in the test (voice names, first-tap voice loading, recognition stopping after each pause).
- 2026-10-02 · Doctor summary API: one call returns a person's symptoms in a date range, their medications and any interaction warnings (#11). Screens prepared for parallel work, plus a read-aloud button (#12) and a phone voice test page (#13).
- 2026-09-28 · Mobile app shell: bottom navigation, English/Traditional Chinese switch, an emergency "Call 999" banner, and a live A&E waiting-times screen (#10).
- 2026-09-28 · Symptom and medication records are saved and listed (#9).
- 2026-09-28 · Drug interaction checker: 24 common HK medications, 8 interactions and duplicate-ingredient warnings (e.g. Panadol + a paracetamol cold medicine), every entry sourced (#8).
- 2026-09-28 · A&E data made robust: hospitals matched by name across languages, and the app stays fast during HA outages (#7).
- 2026-09-28 · Chat to records: Claude turns casual messages into draft symptom and medication entries, with safety guards (#6).
- 2026-09-27 · Live HA A&E waiting times for all 18 hospitals, cached every 15 minutes (#5).
- 2026-09-27 · Care routing and emergency detection: 16 sourced rules in English and Cantonese. Emergencies always show "Call 999" first (#4).
- 2026-09-27 · Project foundation: API contract, backend/frontend structure, CI (#1–#3).

## Challenges

- Safety: the app must never diagnose or invent facts. The AI only organises what the user said; warnings and routing come from curated, sourced rules. Code review caught real safety bugs (e.g. the same drug under two names gave no warning), and they were fixed.
- Clinical validation: rules and drug data cite NHS/FDA/HK Drug Office sources but are not yet checked by a clinician or pharmacist.
- Voice on iPhone is untested (no team iPhone); Android works. Text input stays available as a fallback.
- Cantonese: no native speakers on the team. Chinese text needs a native review (`docs/cantonese-review.md`), and voice recognition on iPhone is still being tested.
- Older users: typing is a barrier, so we are moving to voice-first input and read-aloud.
- Real-world data: HA's English and Chinese files share no hospital ID, and the service can go down.
- Privacy: health data is sensitive; no real user data, no health text in logs, and consent is needed before sending voice or text to AI and speech services.
