import { describe, expect, it } from "vitest";
import { MAX_FEELING, needsFastestAe, readCareFinderForm } from "./finder";

describe("readCareFinderForm", () => {
  it("trims and caps the answers", () => {
    const form = new FormData();
    form.set("feeling", `  ${"a".repeat(MAX_FEELING + 10)}  `);
    form.set("location", "  Kennedy Town MTR ");
    const values = readCareFinderForm(form);
    expect(values.feeling).toHaveLength(MAX_FEELING);
    expect(values.location).toBe("Kennedy Town MTR");
  });

  it("treats missing fields as empty", () => {
    expect(readCareFinderForm(new FormData())).toEqual({ feeling: "", location: "" });
  });
});

describe("needsFastestAe", () => {
  it("asks for the fastest A&E only when the rules say A&E", () => {
    expect(needsFastestAe("ae", false)).toBe(true);
    expect(needsFastestAe("gp", false)).toBe(false);
    expect(needsFastestAe("specialist", false)).toBe(false);
  });

  it("never sends an emergency to an A&E comparison", () => {
    expect(needsFastestAe("call_999", true)).toBe(false);
    expect(needsFastestAe("ae", true)).toBe(false);
  });
});
