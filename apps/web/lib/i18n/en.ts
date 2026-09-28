import type { CareLevel } from "@/lib/api/types";

// English is the reference: every other language must provide the same keys.
export const en = {
  appName: "HK Health Companion",
  appDescription: "Clear health notes, medication support, and care options for Hong Kong.",
  comingSoon: "Coming soon.",
  notMedicalAdvice: "This is not medical advice.",
  navigation: {
    label: "Main navigation",
    chat: "Chat",
    medications: "Medications",
    care: "Find care",
    summary: "Summary",
  },
  language: {
    label: "Language",
    english: "English",
    traditionalChinese: "繁體中文",
  },
  // Screen: /medications (track G adds keys here only).
  medications: {
    title: "Medications",
  },
  emergency: {
    title: "Emergency",
    message: "If you need an ambulance now, call 999.",
    call: "Call 999",
  },
  // Screen: /summary (track H adds keys here only).
  summary: {
    title: "Summary",
  },
  care: {
    title: "Find care",
    intro: "Current waiting times at Hospital Authority A&E departments.",
    listLabel: "A&E waiting times",
    updated: "Updated",
    stale: "These waiting times may be out of date. Check with the hospital before travelling.",
    loading: "Loading A&E waiting times…",
    errorTitle: "Waiting times are unavailable",
    errorMessage: "We could not reach the waiting-time service. Please try again shortly.",
    retry: "Try again",
  },
  careLevel: {
    call_999: "Call 999 now",
    ae: "Go to A&E",
    gp: "See a GP (family doctor)",
    specialist: "Ask a GP about seeing a specialist",
  } satisfies Record<CareLevel, string>,
  // Shared ReadAloudButton.
  readAloud: {
    start: "Read aloud",
    stop: "Stop reading",
  },
  // Screen: /chat, voice-first conversation (Claude).
  chat: {
    title: "Chat",
  },
};

export type Messages = typeof en;
