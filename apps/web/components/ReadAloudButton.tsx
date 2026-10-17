"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Language } from "@/lib/api/types";
import type { Messages } from "@/lib/i18n";
import { speak } from "@/lib/speech/speak";
import styles from "./ReadAloudButton.module.css";

type Props = {
  text: string;
  language: Language;
  messages: Messages["readAloud"];
};

const noSubscribe = () => () => {};
const hasSpeech = () => "speechSynthesis" in window;
// No speech during server rendering; the real value is read after hydration.
const noSpeechOnServer = () => false;

/** Reads `text` aloud with the device's built-in voice. Hidden if the device can't. */
export function ReadAloudButton({ text, language, messages }: Props) {
  const supported = useSyncExternalStore(noSubscribe, hasSpeech, noSpeechOnServer);
  const [speaking, setSpeaking] = useState(false);

  // Stop reading when the button leaves the page.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(text, language, () => setSpeaking(false));
  }

  return (
    <button aria-pressed={speaking} className={styles.button} onClick={toggle} type="button">
      <span aria-hidden="true">{speaking ? "■" : "🔊"}</span> {speaking ? messages.stop : messages.start}
    </button>
  );
}
