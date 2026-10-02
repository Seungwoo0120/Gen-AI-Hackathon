# Waiting for a native Cantonese review

None of the team speaks Cantonese (see `docs/team.md`). Everything below was written
by non-native speakers or AI and must be checked by a native Hong Kong speaker
before the demo. Add items as you write new Chinese text; tick them when reviewed.

- [ ] `apps/web/lib/i18n/zh-Hant.ts`: all UI text (natural HK wording, not Mainland or Taiwan terms)
- [ ] `services/api/app/routing/rules.yaml`: every `zh` emergency and A&E pattern. Are these what people actually say? What common phrasings are missing?
- [ ] `services/api/app/interactions/data/interactions.yaml`: Chinese drug and brand names (some look like Mainland terms, e.g. 氨氯地平, 辛伐他汀)
- [ ] `services/api/app/llm/mock.py`: Chinese symptom keywords
- [ ] `/voice-test` sample sentences (`apps/web/app/voice-test/VoiceTest.tsx`)

Tips for the reviewer session (about 1 hour): open the files side by side with the
English, and note each fix next to the line. One person turns the notes into a PR.
