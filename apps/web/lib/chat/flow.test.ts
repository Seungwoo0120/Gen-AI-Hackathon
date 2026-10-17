import { describe, expect, it } from "vitest";
import type { ChatResult } from "@/lib/api/types";
import { nextStep } from "./flow";

const base: ChatResult = {
  nextQuestion: "ask_onset",
  symptoms: [{ name: "headache", source: "chat" }],
  medications: [],
  emergency: { emergency: false, reasonCodes: [] },
  extractionFailed: false,
};
const turns = [{ answer: "I have a headache" }];
const emergency = { emergency: true, reasonCodes: ["chest_pain"] };

describe("nextStep", () => {
  it("asks the next question", () => {
    expect(nextStep(base, turns)).toEqual({ kind: "ask", question: "ask_onset" });
  });

  it("shows the emergency first, even if extraction failed", () => {
    expect(nextStep({ ...base, emergency }, turns)).toEqual({ kind: "emergency" });
    expect(nextStep({ ...base, emergency, extractionFailed: true }, turns)).toEqual({
      kind: "emergency",
    });
  });

  it("offers a retry when extraction failed or there was no reply", () => {
    const failed = { ...base, nextQuestion: null, symptoms: [], extractionFailed: true };
    expect(nextStep(failed, turns)).toEqual({ kind: "failed" });
    expect(nextStep(null, turns)).toEqual({ kind: "failed" });
  });

  it("reviews when the conversation is done", () => {
    expect(nextStep({ ...base, nextQuestion: null }, turns)).toEqual({ kind: "review" });
  });

  it("reviews instead of asking when another answer could exceed the limits", () => {
    expect(nextStep(base, Array(8).fill({ answer: "x" }))).toEqual({ kind: "review" });
    expect(nextStep(base, [{ answer: "x".repeat(3001) }])).toEqual({ kind: "review" });
  });
});
