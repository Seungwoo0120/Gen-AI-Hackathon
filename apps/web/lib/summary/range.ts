export const summaryRanges = ["7d", "30d", "all"] as const;
export type SummaryRange = (typeof summaryRanges)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
// Hong Kong has no daylight saving time, so a fixed offset is exact.
const HONG_KONG_OFFSET_MS = 8 * 60 * 60 * 1000;
const RANGE_DAYS = { "7d": 7, "30d": 30 } as const;

/** `?range=` value from the URL; anything unknown means the last 30 days. */
export function parseRange(value: string | string[] | undefined): SummaryRange {
  return summaryRanges.find((range) => range === value) ?? "30d";
}

/**
 * Start of the range as an ISO timestamp: midnight in Hong Kong, so "last 7 days"
 * is today plus the 6 days before. `undefined` for everything (no lower bound).
 */
export function rangeFrom(range: SummaryRange, now: Date = new Date()): string | undefined {
  if (range === "all") return undefined;
  const hongKongMidnight =
    Math.floor((now.getTime() + HONG_KONG_OFFSET_MS) / DAY_MS) * DAY_MS - HONG_KONG_OFFSET_MS;
  return new Date(hongKongMidnight - (RANGE_DAYS[range] - 1) * DAY_MS).toISOString();
}
