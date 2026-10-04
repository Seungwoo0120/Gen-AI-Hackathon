import { describe, expect, it } from "vitest";
import { joinSegments, mergeFinal } from "./transcript";

describe("mergeFinal", () => {
  it("drops empty finals", () => {
    expect(mergeFinal([], "  ")).toEqual([]);
    expect(mergeFinal(["頭痛"], "")).toEqual(["頭痛"]);
  });

  it("replaces a partial final with the longer real one (Android)", () => {
    const partial = mergeFinal([], "我由尋日");
    expect(mergeFinal(partial, "我由尋日開始頭痛")).toEqual(["我由尋日開始頭痛"]);
  });

  it("ignores a repeat or a shorter copy of the last segment", () => {
    expect(mergeFinal(["I have a headache"], "I have a headache")).toEqual(["I have a headache"]);
    expect(mergeFinal(["I have a headache"], "I have")).toEqual(["I have a headache"]);
  });

  it("compares without spaces or case", () => {
    expect(mergeFinal(["i have"], "I have a headache")).toEqual(["I have a headache"]);
  });

  it("appends a new phrase after a pause", () => {
    expect(mergeFinal(["頭痛咗兩日"], "食咗兩粒必理痛")).toEqual(["頭痛咗兩日", "食咗兩粒必理痛"]);
  });
});

describe("joinSegments", () => {
  it("joins Chinese without spaces and English with spaces", () => {
    expect(joinSegments(["頭痛咗兩日", "食咗必理痛"], "zh-Hant")).toBe("頭痛咗兩日食咗必理痛");
    expect(joinSegments(["I have a headache", "since yesterday"], "en")).toBe(
      "I have a headache since yesterday",
    );
  });
});
