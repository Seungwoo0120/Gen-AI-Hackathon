import type { Language } from "@/lib/api/types";

// BCP 47 tags for speech. zh-HK is Cantonese; en-GB is closest to Hong Kong English.
const SPEECH_LANG: Record<Language, string> = {
  en: "en-GB",
  "zh-Hant": "zh-HK",
};

export function speechLang(language: Language): string {
  return SPEECH_LANG[language];
}

type VoiceLike = Pick<SpeechSynthesisVoice, "lang" | "localService">;

/** Best installed voice for a speech tag: exact match first, local voices preferred. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: string): V | undefined {
  const normalize = (tag: string) => tag.replace("_", "-").toLowerCase();
  const wanted = normalize(lang);
  const prefix = wanted.split("-")[0];
  const byQuality = (a: V, b: V) => Number(b.localService) - Number(a.localService);
  const exact = voices.filter((v) => normalize(v.lang) === wanted).sort(byQuality);
  if (exact.length > 0) return exact[0];
  // Never fall back from Cantonese to another Chinese voice: Mandarin would read it wrongly.
  if (wanted === "zh-hk") return undefined;
  return voices.filter((v) => normalize(v.lang).startsWith(`${prefix}-`)).sort(byQuality)[0];
}
