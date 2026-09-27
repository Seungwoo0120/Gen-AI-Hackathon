import type { CareLevel } from "@/lib/api/types";

// English is the reference: every other language must provide the same keys.
export const en = {
  appName: "HK Health Companion",
  homeTagline: "Coming soon.",
  notMedicalAdvice: "This is not medical advice.",
  careLevel: {
    call_999: "Call 999 now",
    ae: "Go to A&E",
    gp: "See a GP (family doctor)",
    specialist: "Ask a GP about seeing a specialist",
  } satisfies Record<CareLevel, string>,
};

export type Messages = typeof en;
