import { describe, expect, it } from "vitest";
import type { DoctorSummary } from "@/lib/api/types";
import { en } from "../i18n/en";
import { zhHant } from "../i18n/zh-Hant";
import { readAloudText, scheduleText } from "./text";

const medication = (name: string) => ({
  id: name,
  name,
  createdAt: "2026-10-01T09:00:00+08:00",
});

const summary: DoctorSummary = {
  generatedAt: "2026-10-03T15:00:00+08:00",
  medications: [medication("Panadol"), medication("Amlodipine")],
  interactionWarnings: [
    {
      kind: "duplicate_ingredient",
      severity: "major",
      medications: ["Panadol", "Panadol Cold & Flu"],
      ingredient: "paracetamol",
      summary: { en: "Both contain paracetamol." },
      sources: [{ title: "NHS" }],
    },
  ],
  symptoms: [
    { id: "1", name: "Headache", recordedAt: "2026-10-02T08:00:00+08:00", source: "chat" },
    { id: "2", name: "Cough", recordedAt: "2026-10-01T08:00:00+08:00", source: "manual" },
  ],
};

describe("readAloudText", () => {
  it("reads the counts and medication names in English", () => {
    expect(readAloudText(summary, en.summary.ranges["30d"], "en", en.summary)).toBe(
      "Summary for your doctor: Last 30 days. Medications: 2. Panadol and Amlodipine. " +
        "Interaction warnings: 1. Symptoms: 2.",
    );
  });

  it("reads the counts and medication names in Traditional Chinese", () => {
    expect(readAloudText(summary, zhHant.summary.ranges["7d"], "zh-Hant", zhHant.summary)).toBe(
      "給醫生的摘要：最近 7 日。 藥物：2 種。 Panadol和Amlodipine。 藥物相互作用警告：1 項。 症狀：2 項。",
    );
  });

  it("skips the name list when there are no medications", () => {
    const noMedications = { ...summary, medications: [], interactionWarnings: [] };
    expect(readAloudText(noMedications, en.summary.ranges.all, "en", en.summary)).toBe(
      "Summary for your doctor: All records. Medications: 0. Interaction warnings: 0. Symptoms: 2.",
    );
  });
});

describe("scheduleText", () => {
  it("says every day when no days are set", () => {
    expect(scheduleText({ times: ["08:00", "20:00"] }, "en", en.summary)).toBe(
      "Every day at 08:00 and 20:00",
    );
    expect(scheduleText({ times: ["08:00"], daysOfWeek: null }, "zh-Hant", zhHant.summary)).toBe(
      "每日 08:00",
    );
  });

  it("names the days, Monday = 1 and Sunday = 7", () => {
    expect(scheduleText({ times: ["09:00"], daysOfWeek: [1, 3, 7] }, "en", en.summary)).toBe(
      "Monday, Wednesday, and Sunday at 09:00",
    );
    expect(
      scheduleText({ times: ["09:00"], daysOfWeek: [1, 5] }, "zh-Hant", zhHant.summary),
    ).toBe("星期一和星期五 09:00");
  });

  it("returns nothing when no times were recorded", () => {
    expect(scheduleText(null, "en", en.summary)).toBeNull();
    expect(scheduleText({ times: [] }, "en", en.summary)).toBeNull();
  });
});
