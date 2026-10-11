import { describe, expect, it } from "vitest";
import { parseRange, rangeFrom } from "./range";

describe("parseRange", () => {
  it("accepts the three known ranges", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("30d")).toBe("30d");
    expect(parseRange("all")).toBe("all");
  });

  it("falls back to 30 days for missing, unknown or repeated values", () => {
    expect(parseRange(undefined)).toBe("30d");
    expect(parseRange("90d")).toBe("30d");
    expect(parseRange("")).toBe("30d");
    expect(parseRange(["7d", "all"])).toBe("30d");
  });
});

describe("rangeFrom", () => {
  it("starts at Hong Kong midnight, counting today as day one", () => {
    const now = new Date("2026-10-03T15:00:00+08:00");
    // 27 September 00:00 in Hong Kong is 26 September 16:00 UTC.
    expect(rangeFrom("7d", now)).toBe("2026-09-26T16:00:00.000Z");
    expect(rangeFrom("30d", now)).toBe("2026-09-03T16:00:00.000Z");
  });

  it("uses the Hong Kong date, not the UTC date, just after midnight", () => {
    // 00:30 on 3 October in Hong Kong is still 2 October in UTC.
    const justAfterMidnight = new Date("2026-10-03T00:30:00+08:00");
    const lateEvening = new Date("2026-10-03T23:59:00+08:00");
    expect(rangeFrom("7d", justAfterMidnight)).toBe("2026-09-26T16:00:00.000Z");
    expect(rangeFrom("7d", lateEvening)).toBe("2026-09-26T16:00:00.000Z");
  });

  it("has no lower bound for everything", () => {
    expect(rangeFrom("all", new Date("2026-10-03T15:00:00+08:00"))).toBeUndefined();
  });
});
