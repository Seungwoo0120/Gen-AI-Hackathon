"use server";

import { api } from "@/lib/api/client";
import {
  type CareFinderResult,
  type CareFinderState,
  needsFastestAe,
  readCareFinderForm,
} from "@/lib/care/finder";
import { getLanguage } from "@/lib/i18n/server";

async function fastestAe(
  feeling: string,
  location: string,
): Promise<Extract<CareFinderResult, { kind: "level" }>["fastest"] | "emergency"> {
  if (!location) return { status: "needsLocation" };
  try {
    const { data } = await api.POST("/api/v1/triage", {
      body: { symptoms: feeling, currentLocation: location },
    });
    if (!data) return { status: "unavailable" };
    if (data.emergency.emergency) return "emergency";
    return { status: "found", recommendation: data.recommendation };
  } catch {
    return { status: "unavailable" };
  }
}

/** Rule-based care level first; the A&E comparison only runs when the rules say A&E. */
export async function findCare(
  _previous: CareFinderState,
  formData: FormData,
): Promise<CareFinderState> {
  const values = readCareFinderForm(formData);
  if (!values.feeling) return { values, error: "missingFeeling" };

  try {
    const { data } = await api.POST("/routing/assess", {
      body: { text: values.feeling, lang: await getLanguage() },
    });
    if (!data) return { values, error: "failed" };
    if (data.emergency || data.careLevel === "call_999") {
      return { values, result: { kind: "emergency" } };
    }
    if (!needsFastestAe(data.careLevel, data.emergency)) {
      return { values, result: { kind: "level", careLevel: data.careLevel, fastest: null } };
    }
    const fastest = await fastestAe(values.feeling, values.location);
    if (fastest === "emergency") return { values, result: { kind: "emergency" } };
    return { values, result: { kind: "level", careLevel: "ae", fastest } };
  } catch {
    return { values, error: "failed" };
  }
}
