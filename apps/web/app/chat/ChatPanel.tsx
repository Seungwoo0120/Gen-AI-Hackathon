"use client";

import { useEffect, useRef, useState } from "react";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import type { ChatQuestion, ChatResult, ChatTurn, Language } from "@/lib/api/types";
import {
  type EditableMedication,
  type EditableSymptom,
  toEditable,
  toSave,
} from "@/lib/chat/drafts";
import { MAX_ANSWER, nextStep } from "@/lib/chat/flow";
import type { Messages } from "@/lib/i18n";
import { speak } from "@/lib/speech/speak";
import { useSpeechInput } from "@/lib/speech/useSpeechInput";
import { saveDrafts, sendChat } from "./actions";
import { DraftReview } from "./DraftReview";
import styles from "./chat.module.css";

type Props = {
  language: Language;
  messages: Messages["chat"];
  readAloud: Messages["readAloud"];
  emergency: Messages["emergency"];
};

type Phase = "asking" | "sending" | "error" | "review" | "emergency" | "saved";

export function ChatPanel({ language, messages: t, readAloud, emergency }: Props) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState<ChatQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>("asking");
  const [latest, setLatest] = useState<ChatResult | null>(null);
  const [text, setText] = useState("");
  const [symptoms, setSymptoms] = useState<EditableSymptom[]>([]);
  const [medications, setMedications] = useState<EditableMedication[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const emergencyRef = useRef<HTMLElement>(null);
  const askRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechInput(language, (heard) => answer(heard, true));
  const questionText = question ? t.questions[question] : t.opening;

  // New content appears below a growing conversation: bring it into view. Results
  // also get focus so screen readers start there; a question only scrolls, so the
  // phone keyboard does not pop up over the mic button.
  useEffect(() => {
    if (phase === "emergency") emergencyRef.current?.focus();
    else if (phase === "review" || phase === "saved" || phase === "error") {
      resultRef.current?.focus();
    } else if (phase === "asking" && question) {
      askRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [phase, question]);

  function openReview(result: ChatResult) {
    const editable = toEditable(result);
    setSymptoms(editable.symptoms);
    setMedications(editable.medications);
    setSaveFailed(false);
    setPhase("review");
  }

  async function send(nextTurns: ChatTurn[], byVoice: boolean) {
    setTurns(nextTurns);
    setPhase("sending");
    const result = await sendChat(nextTurns, language);
    if (result) setLatest(result);
    const step = nextStep(result, nextTurns);
    switch (step.kind) {
      case "emergency":
        window.speechSynthesis?.cancel();
        setPhase("emergency");
        return;
      case "failed":
        setPhase("error");
        return;
      case "ask":
        setQuestion(step.question);
        setPhase("asking");
        // Answering by voice means the user is listening, not reading: ask aloud too.
        if (byVoice) speak(t.questions[step.question], language);
        return;
      case "review":
        if (result) openReview(result);
        return;
    }
  }

  function answer(raw: string, byVoice: boolean) {
    const trimmed = raw.trim().slice(0, MAX_ANSWER);
    if (!trimmed || phase !== "asking") return;
    setText("");
    void send([...turns, { question, answer: trimmed }], byVoice);
  }

  async function save() {
    const keptSymptoms = symptoms.filter((item) => item.keep && item.name.trim());
    const keptMedications = medications.filter((item) => item.keep && item.name.trim());
    const payload = toSave(keptSymptoms, keptMedications);
    setSaving(true);
    const outcome = await saveDrafts(payload.symptoms, payload.medications);
    setSaving(false);
    // Drop what was saved, so tapping Save again only resends what failed.
    const savedKeys = new Set([
      ...outcome.savedSymptoms.map((index) => keptSymptoms[index].key),
      ...outcome.savedMedications.map((index) => keptMedications[index].key),
    ]);
    const failed =
      outcome.savedSymptoms.length < keptSymptoms.length ||
      outcome.savedMedications.length < keptMedications.length;
    setSymptoms((items) => items.filter((item) => !savedKeys.has(item.key)));
    setMedications((items) => items.filter((item) => !savedKeys.has(item.key)));
    setSaveFailed(failed);
    if (!failed) setPhase("saved");
  }

  function startOver() {
    speech.stop();
    window.speechSynthesis?.cancel();
    setTurns([]);
    setQuestion(null);
    setLatest(null);
    setText("");
    setSymptoms([]);
    setMedications([]);
    setSaveFailed(false);
    setPhase("asking");
  }

  const hasDrafts = Boolean(latest && (latest.symptoms.length || latest.medications.length));

  return (
    <div className={styles.panel}>
      {phase === "emergency" ? (
        <section
          aria-labelledby="chat-emergency-title"
          className={styles.emergency}
          ref={emergencyRef}
          role="alert"
          tabIndex={-1}
        >
          <h2 id="chat-emergency-title">{t.emergencyTitle}</h2>
          <p>{t.emergencyMessage}</p>
          <a className={styles.callButton} href="tel:999">
            {emergency.call}
          </a>
          <a className="button-link" href="/care">
            {t.findCare}
          </a>
        </section>
      ) : null}

      <ol aria-label={t.conversationLabel} className={styles.conversation}>
        {turns.map((turn, index) => (
          <li key={index}>
            <p className={styles.appBubble}>
              {turn.question ? t.questions[turn.question] : t.opening}
            </p>
            <p className={styles.userBubble}>
              <span className={styles.visuallyHidden}>{t.you}: </span>
              {turn.answer}
            </p>
          </li>
        ))}
      </ol>

      {phase === "asking" || phase === "sending" ? (
        <section aria-live="polite" className={styles.ask} ref={askRef}>
          <p className={styles.question}>{phase === "sending" ? t.sending : questionText}</p>
          {phase === "asking" ? (
            <ReadAloudButton language={language} messages={readAloud} text={questionText} />
          ) : null}
        </section>
      ) : null}

      {phase === "asking" ? (
        <>
          {speech.supported ? (
            <>
              <button
                aria-pressed={speech.listening}
                className={speech.listening ? `${styles.mic} ${styles.listening}` : styles.mic}
                onClick={speech.listening ? speech.stop : speech.start}
                type="button"
              >
                <span aria-hidden="true">{speech.listening ? "■" : "🎤"}</span>{" "}
                {speech.listening ? t.micStop : t.micStart}
              </button>
              {speech.listening ? (
                <p aria-live="polite" className={styles.heard}>
                  {speech.heard || speech.interim ? (
                    <>
                      {speech.heard} <span className={styles.interim}>{speech.interim}</span>
                    </>
                  ) : (
                    t.listening
                  )}
                </p>
              ) : null}
              {speech.problem ? (
                <p className="status-notice status-notice--warning" role="status">
                  {speech.problem === "blocked" ? t.micBlocked : t.micFailed}
                </p>
              ) : null}
            </>
          ) : (
            <p className="status-notice" role="status">
              {t.noVoice}
            </p>
          )}

          <form
            className={styles.typeForm}
            onSubmit={(event) => {
              event.preventDefault();
              answer(text, false);
            }}
          >
            <label htmlFor="chat-answer">{t.typeLabel}</label>
            <textarea
              id="chat-answer"
              maxLength={MAX_ANSWER}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              value={text}
            />
            <button className={styles.secondary} disabled={!text.trim()} type="submit">
              {t.send}
            </button>
          </form>

          {hasDrafts && latest ? (
            <button className={styles.secondary} onClick={() => openReview(latest)} type="button">
              {t.finishNow}
            </button>
          ) : null}

          <p className={styles.privacy}>{t.privacy}</p>
        </>
      ) : null}

      <div className={styles.result} ref={resultRef} tabIndex={-1}>
        {phase === "error" ? (
          <section className="status-notice status-notice--error" role="alert">
            <h2>{t.errorTitle}</h2>
            <p>{t.errorMessage}</p>
            <button
              className={styles.secondary}
              onClick={() => void send(turns, false)}
              type="button"
            >
              {t.retry}
            </button>
          </section>
        ) : null}

        {phase === "review" ? (
          <DraftReview
            language={language}
            medications={medications}
            messages={t.review}
            onMedicationsChange={setMedications}
            onSave={() => void save()}
            onSymptomsChange={setSymptoms}
            saveFailed={saveFailed}
            saving={saving}
            symptoms={symptoms}
          />
        ) : null}

        {phase === "saved" ? (
          <section aria-live="polite" className={styles.saved}>
            <h2>{t.saved.title}</h2>
            <p>{t.saved.message}</p>
            <a className="button-link" href="/summary">
              {t.saved.summary}
            </a>
          </section>
        ) : null}
      </div>

      {turns.length > 0 && phase !== "sending" ? (
        <button className={styles.secondary} onClick={startOver} type="button">
          {t.startOver}
        </button>
      ) : null}
    </div>
  );
}
