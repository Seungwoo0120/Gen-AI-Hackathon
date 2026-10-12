import type { DoctorSummary, Language, Medication } from "@/lib/api/types";
import type { Messages } from "@/lib/i18n";

type SummaryMessages = Messages["summary"];

const HONG_KONG = "Asia/Hong_Kong";

/** Replaces `{key}` placeholders in a message. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

/** "A and B" / "A和B", in the reader's language. */
export function joinList(items: string[], language: Language): string {
  return new Intl.ListFormat(language, { type: "conjunction" }).format(items);
}

export function formatDateTime(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: HONG_KONG,
  }).format(new Date(value));
}

export function formatDate(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: HONG_KONG }).format(
    new Date(value),
  );
}

// 1 January 2024 was a Monday, so contract days 1 (Monday) to 7 (Sunday) map onto 1-7 January.
function weekdayName(day: number, language: Language): string {
  return new Intl.DateTimeFormat(language, { weekday: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2024, 0, day)),
  );
}

/** "Every day at 08:00 and 20:00", or null when no times were recorded. */
export function scheduleText(
  schedule: Medication["schedule"],
  language: Language,
  t: SummaryMessages,
): string | null {
  if (!schedule?.times.length) return null;
  const times = joinList(schedule.times, language);
  if (!schedule.daysOfWeek?.length) return fill(t.everyDay, { times });
  const days = joinList(
    schedule.daysOfWeek.map((day) => weekdayName(day, language)),
    language,
  );
  return fill(t.onDays, { days, times });
}

/** Short spoken version of the summary: the counts plus the medication names. */
export function readAloudText(
  summary: DoctorSummary,
  rangeLabel: string,
  language: Language,
  t: SummaryMessages,
): string {
  const names = summary.medications.map((medication) => medication.name);
  return [
    fill(t.readAloudIntro, { range: rangeLabel }),
    fill(t.readAloudMedications, { count: names.length }),
    names.length ? fill(t.readAloudMedicationNames, { names: joinList(names, language) }) : "",
    fill(t.readAloudWarnings, { count: summary.interactionWarnings.length }),
    fill(t.readAloudSymptoms, { count: summary.symptoms.length }),
  ]
    .filter(Boolean)
    .join(" ");
}
