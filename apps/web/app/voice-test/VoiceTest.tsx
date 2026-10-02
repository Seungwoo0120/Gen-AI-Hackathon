"use client";

// Temporary spike: English-only text inline on purpose (not a user-facing screen).
import { useRef, useState, useSyncExternalStore } from "react";
import { getRecognitionConstructor, type Recognition } from "@/lib/speech/recognition";
import { loadVoices, pickVoice } from "@/lib/speech/voices";
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
// Errors where restarting can't help; anything else (e.g. no-speech) restarts.
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

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
  // True from tap-to-start until tap-to-stop. Mobile browsers end recognition after a
  // second or two of silence, so we restart until the user stops it.
  const wantListening = useRef(false);
  const sessions = useRef(0);

  function note(text: string) {
    setLog((entries) => [{ at: new Date().toLocaleTimeString(), text }, ...entries].slice(0, 200));
  }

  // `startTime` is the click's event.timeStamp, on the same clock as performance.now().
  function toggleListening(startTime: number) {
    if (listening) {
      wantListening.current = false;
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
          // Tag each line so runs in different languages can be told apart.
          setFinals((items) => [...items, `[${recognition.lang}] ${text}`]);
          note(`[${recognition.lang}] final after ${seconds}s, confidence ${result[0].confidence.toFixed(2)}`);
        } else {
          pending += text;
        }
      }
      setInterim(pending);
    };
    recognition.onerror = (event) => {
      note(`error: ${event.error}`);
      if (FATAL_ERRORS.has(event.error)) wantListening.current = false;
    };
    recognition.onend = () => {
      setInterim("");
      if (wantListening.current && sessions.current < 100) {
        note(`browser ended session ${sessions.current}; restarting`);
        // A short pause avoids a tight loop if the browser ends immediately.
        window.setTimeout(() => startSession(recognition), 250);
        return;
      }
      wantListening.current = false;
      setListening(false);
      note("stopped");
    };
    wantListening.current = true;
    sessions.current = 0;
    startedAt.current = startTime;
    recognitionRef.current = recognition;
    setListening(true);
    note(`listening in ${lang}`);
    startSession(recognition);
  }

  function startSession(recognition: Recognition) {
    if (!wantListening.current) {
      setListening(false);
      return;
    }
    try {
      sessions.current += 1;
      recognition.start();
    } catch (error) {
      wantListening.current = false;
      setListening(false);
      note(`start failed: ${String(error)}`);
    }
  }

  function listVoices() {
    const all = window.speechSynthesis.getVoices();
    const relevant = all.filter((v) => /^(zh|yue|en)/i.test(v.lang));
    setVoices(relevant.map((v) => `${v.lang} · ${v.name}${v.localService ? " · local" : ""}`));
    note(`${all.length} voices total, ${relevant.length} zh/yue/en`);
  }

  async function speak(tag: "zh-HK" | "en-GB") {
    const synth = window.speechSynthesis;
    const before = synth.getVoices().length;
    const voices = await loadVoices(synth);
    if (before === 0) note(`voices were not loaded yet; waited, now ${voices.length}`);
    const voice = pickVoice(voices, tag);
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
          onClick={(event) => toggleListening(event.timeStamp)}
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
        <p className={styles.small}>Voice picker v3 (waits for voices)</p>
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
        <button
          className={styles.button}
          onClick={() => {
            setFinals([]);
            setLog([]);
          }}
          type="button"
        >
          Clear results and log
        </button>
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
