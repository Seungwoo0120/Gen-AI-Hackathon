"use client";

// Temporary spike: English-only text inline on purpose (not a user-facing screen).
import { useRef, useState, useSyncExternalStore } from "react";
import { getRecognitionConstructor, type Recognition } from "@/lib/speech/recognition";
import { pickVoice } from "@/lib/speech/voices";
import styles from "./VoiceTest.module.css";

const LANGS = [
  { tag: "zh-HK", label: "Cantonese (zh-HK)" },
  { tag: "yue-Hant-HK", label: "Cantonese (yue-Hant-HK)" },
  { tag: "en-GB", label: "English (en-GB)" },
];
const SAMPLE = { "zh-HK": "你好，我係香港健康助手。你今日覺得點呀？", "en-GB": "Hello. How are you feeling today?" };

type Env = { secure: boolean; recognition: boolean; synthesis: boolean; userAgent: string };
const serverEnv: Env = { secure: false, recognition: false, synthesis: false, userAgent: "" };
let cachedEnv: Env | null = null;
function readEnv(): Env {
  cachedEnv ??= {
    secure: window.isSecureContext,
    recognition: Boolean(getRecognitionConstructor()),
    synthesis: "speechSynthesis" in window,
    userAgent: navigator.userAgent,
  };
  return cachedEnv;
}
const noSubscribe = () => () => {};

type Log = { at: string; text: string };

export function VoiceTest() {
  const env = useSyncExternalStore(noSubscribe, readEnv, () => serverEnv);
  const [lang, setLang] = useState("zh-HK");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finals, setFinals] = useState<string[]>([]);
  const [log, setLog] = useState<Log[]>([]);
  const [voices, setVoices] = useState<string[]>([]);
  const recognitionRef = useRef<Recognition | null>(null);
  const startedAt = useRef(0);

  function note(text: string) {
    setLog((entries) => [{ at: new Date().toLocaleTimeString(), text }, ...entries].slice(0, 30));
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionConstructor();
    if (!Ctor) {
      note("No SpeechRecognition in this browser.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          const seconds = ((performance.now() - startedAt.current) / 1000).toFixed(1);
          setFinals((items) => [...items, text]);
          note(`final after ${seconds}s, confidence ${result[0].confidence.toFixed(2)}`);
        } else {
          pending += text;
        }
      }
      setInterim(pending);
    };
    recognition.onerror = (event) => note(`error: ${event.error}`);
    recognition.onend = () => {
      setListening(false);
      setInterim("");
      note("stopped");
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
      startedAt.current = performance.now();
      setListening(true);
      note(`listening in ${lang}`);
    } catch (error) {
      note(`start failed: ${String(error)}`);
    }
  }

  function listVoices() {
    const all = window.speechSynthesis.getVoices();
    const relevant = all.filter((v) => /^(zh|yue|en)/i.test(v.lang));
    setVoices(relevant.map((v) => `${v.lang} · ${v.name}${v.localService ? " · local" : ""}`));
    note(`${all.length} voices total, ${relevant.length} zh/yue/en`);
  }

  function speak(tag: "zh-HK" | "en-GB") {
    const synth = window.speechSynthesis;
    const voice = pickVoice(synth.getVoices(), tag);
    const utterance = new SpeechSynthesisUtterance(SAMPLE[tag]);
    utterance.lang = tag;
    utterance.voice = voice ?? null;
    utterance.rate = 0.9;
    utterance.onerror = (event) => note(`speak error: ${event.error}`);
    synth.cancel();
    synth.speak(utterance);
    note(`speaking ${tag} with ${voice ? `${voice.name} (${voice.lang})` : "NO matching voice"}`);
  }

  const ok = (value: boolean) => (value ? "✅" : "❌");

  return (
    <main className={styles.page}>
      <h1>Voice test</h1>
      <p>Temporary page to check speech on this device. Screenshot the whole page when done.</p>

      <section className={styles.card}>
        <h2>1. Device</h2>
        <ul>
          <li>{ok(env.secure)} Secure context (HTTPS)</li>
          <li>{ok(env.recognition)} Speech recognition</li>
          <li>{ok(env.synthesis)} Speech synthesis</li>
        </ul>
        <p className={styles.small}>{env.userAgent}</p>
      </section>

      <section className={styles.card}>
        <h2>2. Speak → text</h2>
        <label className={styles.field}>
          Language
          <select disabled={listening} onChange={(e) => setLang(e.target.value)} value={lang}>
            {LANGS.map((l) => (
              <option key={l.tag} value={l.tag}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <button
          aria-pressed={listening}
          className={listening ? `${styles.mic} ${styles.listening}` : styles.mic}
          onClick={toggleListening}
          type="button"
        >
          {listening ? "■ Stop" : "🎤 Tap and speak"}
        </button>
        <p className={styles.small}>
          Try: 我由尋日開始頭痛，食咗兩粒必理痛 / 我心口痛，唞唔到氣
        </p>
        <div aria-live="polite" className={styles.transcript}>
          {finals.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
          {interim ? <p className={styles.interim}>{interim}</p> : null}
        </div>
      </section>

      <section className={styles.card}>
        <h2>3. Text → speech</h2>
        <div className={styles.row}>
          <button className={styles.button} onClick={() => speak("zh-HK")} type="button">
            🔊 Cantonese
          </button>
          <button className={styles.button} onClick={() => speak("en-GB")} type="button">
            🔊 English
          </button>
          <button className={styles.button} onClick={listVoices} type="button">
            List voices
          </button>
        </div>
        <ul className={styles.small}>
          {voices.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        <h2>Log</h2>
        <ul className={styles.small}>
          {log.map((entry, i) => (
            <li key={i}>
              {entry.at} {entry.text}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
