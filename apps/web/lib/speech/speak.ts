import type { Language } from "@/lib/api/types";
import { loadVoices, pickVoice, speechLang } from "./voices";

/** Read `text` aloud with the device's voice for `language`. Calls `onDone` when finished. */
export function speak(text: string, language: Language, onDone: () => void = () => {}): void {
  const synth = window.speechSynthesis;
  const lang = speechLang(language);
  const speakWith = (voices: SpeechSynthesisVoice[]) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.voice = pickVoice(voices, lang) ?? null;
    utterance.rate = 0.9; // A little slower for older listeners.
    utterance.onend = onDone;
    utterance.onerror = onDone;
    synth.cancel();
    synth.speak(utterance);
  };
  // Speak in the same tap when voices are ready: some browsers only allow speech
  // that starts directly from a user gesture.
  const ready = synth.getVoices();
  if (ready.length > 0) speakWith(ready);
  else void loadVoices(synth).then(speakWith);
}
