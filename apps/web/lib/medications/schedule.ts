import type { MedicationInput } from "@/lib/api/types";

type MedicationSchedule = NonNullable<MedicationInput["schedule"]>;

export type ScheduleLabels = {
  everyDay: string;
  noTimes: string;
  /** Short day names keyed 1 (Monday) through 7 (Sunday), matching the contract. */
  dayNames: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string>;
};

/** Turns a schedule into plain words, e.g. "08:00, 20:00 · every day". */
export function formatSchedule(
  schedule: MedicationSchedule | null | undefined,
  labels: ScheduleLabels,
): string {
  if (!schedule) return labels.noTimes;
  if (schedule.times.length === 0 && !schedule.daysOfWeek?.length) return labels.noTimes;
  const times = schedule.times.length ? schedule.times.join(", ") : labels.noTimes;
  return `${times} · ${formatDays(schedule.daysOfWeek, labels)}`;
}

function formatDays(
  daysOfWeek: readonly number[] | null | undefined,
  labels: ScheduleLabels,
): string {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return labels.everyDay;
  }
  return [...daysOfWeek]
    .sort((a, b) => a - b)
    .map((day) => labels.dayNames[day as 1 | 2 | 3 | 4 | 5 | 6 | 7])
    .join(", ");
}
