import { afterEach, describe, expect, it, vi } from "vitest";
import { loadVoices, parseTag, pickVoice, speechLang } from "./voices";

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

  // Real voice tags reported by a Samsung Galaxy (Android, Chromium) on 2026-10-03.
  const galaxy = [
    "en_AU", "en_GB", "en_IN", "en_US", "yue_HK_#Hant", "zh_CN_#Hans", "zh_HK_#Hans",
    "zh_HK_#Hant", "zh_TW_#Hant",
  ].map((lang) => voice(lang));

  it("finds the Cantonese voice among Android-style tags", () => {
    expect(pickVoice(galaxy, "zh-HK")?.lang).toBe("yue_HK_#Hant");
  });

  it("uses a Hong Kong Chinese voice when no yue voice exists", () => {
    const noYue = galaxy.filter((v) => !v.lang.startsWith("yue"));
    expect(pickVoice(noYue, "zh-HK")?.lang).toBe("zh_HK_#Hant");
  });

  it("finds English on Android-style tags", () => {
    expect(pickVoice(galaxy, "en-GB")?.lang).toBe("en_GB");
  });

  it("parses the tag formats browsers use", () => {
    expect(parseTag("zh_HK_#Hant")).toEqual({ language: "zh", region: "HK", script: "Hant" });
    expect(parseTag("yue-Hant-HK")).toEqual({ language: "yue", region: "HK", script: "Hant" });
    expect(parseTag("en-GB")).toEqual({ language: "en", region: "GB" });
  });
});

describe("loadVoices", () => {
  afterEach(() => vi.useRealTimers());

  function fakeSynth(initial: string[]) {
    let voices = initial;
    const target = new EventTarget();
    return {
      getVoices: () => voices,
      addEventListener: (type: "voiceschanged", listener: () => void) =>
        target.addEventListener(type, listener),
      removeEventListener: (type: "voiceschanged", listener: () => void) =>
        target.removeEventListener(type, listener),
      load(next: string[]) {
        voices = next;
        target.dispatchEvent(new Event("voiceschanged"));
      },
    };
  }

  it("returns voices that are already loaded", async () => {
    await expect(loadVoices(fakeSynth(["en-GB"]))).resolves.toEqual(["en-GB"]);
  });

  it("waits for the browser to load voices", async () => {
    const synth = fakeSynth([]);
    const pending = loadVoices(synth);
    synth.load(["yue_HK_#Hant"]);
    await expect(pending).resolves.toEqual(["yue_HK_#Hant"]);
  });

  it("gives up after the timeout with no voices", async () => {
    vi.useFakeTimers();
    const pending = loadVoices(fakeSynth([]), 1500);
    vi.advanceTimersByTime(1500);
    await expect(pending).resolves.toEqual([]);
  });
});
