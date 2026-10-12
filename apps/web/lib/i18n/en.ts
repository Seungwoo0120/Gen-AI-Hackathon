import type { CareLevel, InteractionWarning } from "@/lib/api/types";
import type { SummaryRange } from "@/lib/summary/range";

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
    title: "Summary for your doctor",
    rangeLabel: "Time period",
    ranges: {
      "7d": "Last 7 days",
      "30d": "Last 30 days",
      all: "All records",
    } satisfies Record<SummaryRange, string>,
    since: "(since {date})",
    labelValue: "{label}: {value}",
    generated: "Created",
    print: "Print",
    medications: "Medications",
    dose: "Dose",
    everyDay: "Every day at {times}",
    onDays: "{days} at {times}",
    noMedications: "No medications recorded.",
    warnings: "Interaction warnings",
    warningKind: {
      interaction: "Drug interaction",
      duplicate_ingredient: "Same active ingredient",
    } satisfies Record<InteractionWarning["kind"], string>,
    warningSeverity: "Severity",
    severity: {
      major: "Major",
      moderate: "Moderate",
      minor: "Minor",
    } satisfies Record<InteractionWarning["severity"], string>,
    involved: "Medications involved",
    sources: "Sources",
    symptoms: "Symptoms",
    symptomSeverity: "Severity: {value} / 5",
    viaChat: "via chat",
    noSymptoms: "No symptoms recorded in this period.",
    emptyTitle: "Nothing recorded in this period",
    emptyMessage: "Tell the app how you feel in Chat, or add your medicines. They will appear here.",
    goToChat: "Go to Chat",
    goToMedications: "Go to Medications",
    errorTitle: "The summary is unavailable",
    errorMessage: "We could not reach your records. Please try again shortly.",
    retry: "Try again",
    readAloudIntro: "Summary for your doctor: {range}.",
    readAloudMedications: "Medications: {count}.",
    readAloudMedicationNames: "{names}.",
    readAloudWarnings: "Interaction warnings: {count}.",
    readAloudSymptoms: "Symptoms: {count}.",
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
