import { describe, expect, it } from "vitest";
import type { ChatResult } from "@/lib/api/types";
import { alreadyListed, canAnswerMore, toEditable, toSave } from "./drafts";

const result: ChatResult = {
  nextQuestion: null,
  symptoms: [
    // The generated type requires `source`; toSave must set it to "chat" whatever it was.
    { name: "headache", severity: 3, details: "since yesterday morning", source: "manual" },
    { name: "cough", source: "manual" },
  ],
  medications: [{ name: "Panadol", dose: "2 tablets", schedule: { times: ["08:00"] } }],
  emergency: { emergency: false, reasonCodes: [] },
  extractionFailed: false,
};

describe("drafts", () => {
  it("saves kept items, marks symptoms as from chat, keeps schedules", () => {
    const { symptoms, medications } = toEditable(result);
    symptoms[1].keep = false;
    expect(toSave(symptoms, medications)).toEqual({
      symptoms: [
        { name: "headache", severity: 3, details: "since yesterday morning", source: "chat" },
      ],
      medications: [{ name: "Panadol", dose: "2 tablets", schedule: { times: ["08:00"] } }],
    });
  });

  it("trims edits, turns blanks into null and skips nameless items", () => {
    const { symptoms, medications } = toEditable(result);
    symptoms[0] = { ...symptoms[0], name: "  bad headache ", details: "  " };
    symptoms[1] = { ...symptoms[1], name: "   " };
    medications[0] = { ...medications[0], dose: "" };
    const saved = toSave(symptoms, medications);
    expect(saved.symptoms).toEqual([
      { name: "bad headache", severity: 3, details: null, source: "chat" },
    ]);
    expect(saved.medications[0].dose).toBeNull();
  });

  it("gives every draft a stable key", () => {
    const { symptoms, medications } = toEditable(result);
    expect([...symptoms, ...medications].map((item) => item.key)).toEqual(["s0", "s1", "m0"]);
  });

  it("stops at the contract's turn limit", () => {
    const turn = { answer: "x" };
    expect(canAnswerMore(Array(7).fill(turn))).toBe(true);
    expect(canAnswerMore(Array(8).fill(turn))).toBe(false);
  });
});

describe("alreadyListed", () => {
  const medicine = (name: string) => ({ name, dose: null, schedule: null, notes: null });

  it("skips medicines already on the list, ignoring case and spaces", () => {
    const repeats = alreadyListed(
      [medicine(" panadol "), medicine("Metformin"), medicine("Simvastatin")],
      ["Panadol", "Metformin  "],
    );
    expect([...repeats]).toEqual([0, 1]);
  });

  it("saves a medicine said twice in one conversation only once", () => {
    expect([...alreadyListed([medicine("Panadol"), medicine("PANADOL")], [])]).toEqual([1]);
  });

  it("keeps different medicines that share an ingredient, so the warning still shows", () => {
    expect(alreadyListed([medicine("Panadol Cold & Flu")], ["Panadol"]).size).toBe(0);
  });
});
