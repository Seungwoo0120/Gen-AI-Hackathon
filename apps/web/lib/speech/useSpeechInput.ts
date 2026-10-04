"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Language } from "@/lib/api/types";
import { getRecognitionConstructor, type Recognition } from "./recognition";
import { joinSegments, mergeFinal } from "./transcript";
import { speechLang } from "./voices";

// Errors where restarting can't help; anything else (e.g. no-speech) restarts.
const FATAL_ERRORS = new Set([
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
  "language-not-supported",
]);
const BLOCKED_ERRORS = new Set(["not-allowed", "service-not-allowed"]);
// Safety net against a browser that ends every session immediately.
const MAX_SESSIONS = 100;

const noSubscribe = () => () => {};
const hasRecognition = () => Boolean(getRecognitionConstructor());
const noRecognitionOnServer = () => false;

export type SpeechInputProblem = "blocked" | "failed" | null;

/**
 * Tap-to-start, tap-to-stop speech input. Mobile browsers end recognition after each
 * pause, so it restarts until the user stops it, then calls `onFinished` once with
 * everything heard (possibly an empty string).
 */
export function useSpeechInput(language: Language, onFinished: (text: string) => void) {
  const supported = useSyncExternalStore(noSubscribe, hasRecognition, noRecognitionOnServer);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [interim, setInterim] = useState("");
  const [problem, setProblem] = useState<SpeechInputProblem>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const wantListening = useRef(false);
  const sessions = useRef(0);
  const segments = useRef<string[]>([]);
  const finishedRef = useRef(onFinished);

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  // Release the microphone when the screen goes away.
  useEffect(
    () => () => {
      wantListening.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  function startSession(recognition: Recognition) {
    if (!wantListening.current) return;
    try {
      sessions.current += 1;
      recognition.start();
    } catch {
      wantListening.current = false;
      setProblem("failed");
      setListening(false);
    }
  }

  function start() {
    const Ctor = getRecognitionConstructor();
    if (!Ctor || listening) return;
    // Don't let the app's own read-aloud voice be heard as the answer.
    window.speechSynthesis?.cancel();
    const recognition = new Ctor();
    recognition.lang = speechLang(language);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          segments.current = mergeFinal(segments.current, result[0].transcript);
        } else {
          pending += result[0].transcript;
        }
      }
      setHeard(joinSegments(segments.current, language));
      setInterim(pending);
    };
    recognition.onerror = (event) => {
      if (!FATAL_ERRORS.has(event.error)) return;
      wantListening.current = false;
      setProblem(BLOCKED_ERRORS.has(event.error) ? "blocked" : "failed");
    };
    recognition.onend = () => {
      setInterim("");
      if (wantListening.current && sessions.current < MAX_SESSIONS) {
        // A short pause avoids a tight loop if the browser ends immediately.
        window.setTimeout(() => startSession(recognition), 250);
        return;
      }
      wantListening.current = false;
      recognitionRef.current = null;
      setListening(false);
      const text = joinSegments(segments.current, language);
      segments.current = [];
      setHeard("");
      finishedRef.current(text);
    };
    segments.current = [];
    sessions.current = 0;
    wantListening.current = true;
    recognitionRef.current = recognition;
    setProblem(null);
    setHeard("");
    setListening(true);
    startSession(recognition);
  }

  /** Stop and deliver what was heard: the final result can still arrive after stop(). */
  function stop() {
    wantListening.current = false;
    recognitionRef.current?.stop();
  }

  return { supported, listening, heard, interim, problem, start, stop };
}
