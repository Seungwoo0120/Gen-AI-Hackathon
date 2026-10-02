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

type ParsedTag = { language: string; region?: string; script?: string };

/**
 * Parse a voice or speech tag. Browsers disagree on the format: "zh-HK",
 * "zh_HK", and on Android "zh_HK_#Hant" or "yue_HK_#Hant".
 */
export function parseTag(tag: string): ParsedTag {
  const [language = "", ...rest] = tag.replace(/#/g, "").split(/[-_]/).filter(Boolean);
  const parsed: ParsedTag = { language: language.toLowerCase() };
  for (const part of rest) {
    if (/^[a-z]{4}$/i.test(part)) parsed.script = part[0].toUpperCase() + part.slice(1).toLowerCase();
    else if (/^([a-z]{2}|\d{3})$/i.test(part)) parsed.region = part.toUpperCase();
  }
  return parsed;
}

function isCantonese({ language, region }: ParsedTag): boolean {
  return language === "yue" || (language === "zh" && region === "HK");
}

// Higher is better; 0 means "don't use this voice".
function score(voice: ParsedTag, wanted: ParsedTag): number {
  if (isCantonese(wanted)) {
    // Only Cantonese voices: a Mandarin voice would read Cantonese text wrongly.
    if (voice.language === "yue") return 4;
    if (voice.language === "zh" && voice.region === "HK") return voice.script === "Hans" ? 2 : 3;
    return 0;
  }
  if (voice.language !== wanted.language) return 0;
  return voice.region === wanted.region ? 2 : 1;
}

/** Best installed voice for a speech tag, preferring on-device voices; undefined if none fits. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: string): V | undefined {
  const wanted = parseTag(lang);
  let best: { voice: V; rank: number } | undefined;
  for (const voice of voices) {
    const points = score(parseTag(voice.lang), wanted);
    if (points === 0) continue;
    const rank = points * 2 + Number(voice.localService);
    if (!best || rank > best.rank) best = { voice, rank };
  }
  return best?.voice;
}

type VoiceSource<V> = {
  getVoices(): V[];
  addEventListener(type: "voiceschanged", listener: () => void): void;
  removeEventListener(type: "voiceschanged", listener: () => void): void;
};

/**
 * Installed voices, waiting briefly if the browser hasn't loaded them yet. Android
 * Chrome returns an empty list until shortly after page load, so the first tap would
 * otherwise get no voice (seen on a Galaxy, 2026-10-03).
 */
export function loadVoices<V>(synth: VoiceSource<V>, timeoutMs = 1500): Promise<V[]> {
  const ready = synth.getVoices();
  if (ready.length > 0) return Promise.resolve(ready);
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(finish, timeoutMs);
    synth.addEventListener("voiceschanged", finish);
  });
}
