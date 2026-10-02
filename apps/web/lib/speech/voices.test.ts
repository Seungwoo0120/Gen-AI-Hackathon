import { describe, expect, it } from "vitest";
import { pickVoice, speechLang } from "./voices";

const voice = (lang: string, localService = true) => ({ lang, localService });

describe("speech voices", () => {
  it("maps app languages to speech tags", () => {
    expect(speechLang("en")).toBe("en-GB");
    expect(speechLang("zh-Hant")).toBe("zh-HK");
  });

  it("prefers an exact local voice", () => {
    const voices = [voice("zh-HK", false), voice("zh-HK", true), voice("zh-TW")];
    expect(pickVoice(voices, "zh-HK")).toBe(voices[1]);
  });

  it("accepts underscore tags from some browsers", () => {
    const voices = [voice("zh_HK")];
    expect(pickVoice(voices, "zh-HK")).toBe(voices[0]);
  });

  it("never reads Cantonese with a Mandarin voice", () => {
    expect(pickVoice([voice("zh-CN"), voice("zh-TW")], "zh-HK")).toBeUndefined();
  });

  it("falls back to another English voice", () => {
    const voices = [voice("en-US")];
    expect(pickVoice(voices, "en-GB")).toBe(voices[0]);
  });
});
