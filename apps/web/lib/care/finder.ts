import type { CareLevel } from "@/lib/api/types";

export const MAX_FEELING = 2000;
export const MAX_LOCATION = 200;

export type CareFinderValues = { feeling: string; location: string };

export type CareFinderResult =
  | { kind: "emergency" }
  | {
      kind: "level";
      careLevel: Exclude<CareLevel, "call_999">;
      // Only for careLevel "ae": the fastest A&E, or why there is none.
      fastest:
        | { status: "found"; recommendation: string }
        | { status: "needsLocation" }
        | { status: "unavailable" }
        | null;
    };

export type CareFinderState = {
  values: CareFinderValues;
  error?: "missingFeeling" | "failed";
  result?: CareFinderResult;
};

export function readCareFinderForm(formData: FormData): CareFinderValues {
  return {
    feeling: String(formData.get("feeling") ?? "").trim().slice(0, MAX_FEELING),
    location: String(formData.get("location") ?? "").trim().slice(0, MAX_LOCATION),
  };
}

/** Whether to ask the A&E routing agent: only when the rules already say A&E. */
export function needsFastestAe(careLevel: CareLevel, emergency: boolean): boolean {
  return !emergency && careLevel === "ae";
}
