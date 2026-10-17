"use client";

import { useActionState, useEffect, useRef } from "react";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import type { Language } from "@/lib/api/types";
import { type CareFinderState, MAX_FEELING, MAX_LOCATION } from "@/lib/care/finder";
import type { Messages } from "@/lib/i18n";
import { findCare } from "./actions";
import styles from "./care.module.css";

type Props = {
  language: Language;
  messages: Messages["care"]["finder"];
  careLevel: Messages["careLevel"];
  emergency: Messages["emergency"];
  readAloud: Messages["readAloud"];
};

const initialState: CareFinderState = { values: { feeling: "", location: "" } };

export function CareFinder({ language, messages: t, careLevel, emergency, readAloud }: Props) {
  // The form posts to /care, so it works before hydration and without JavaScript too.
  const [state, formAction, pending] = useActionState(findCare, initialState, "/care");
  const resultRef = useRef<HTMLDivElement>(null);
  const result = state.result;

  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  return (
    <section aria-labelledby="care-finder-title" className={styles.finder}>
      <h2 id="care-finder-title">{t.title}</h2>
      <p>{t.intro}</p>

      <form action={formAction} className={styles.form}>
        <label className={styles.field}>
          {t.feelingLabel}
          <textarea
            defaultValue={state.values.feeling}
            maxLength={MAX_FEELING}
            name="feeling"
            placeholder={t.feelingPlaceholder}
            rows={3}
          />
        </label>
        <label className={styles.field}>
          {t.locationLabel}
          <input
            autoComplete="off"
            defaultValue={state.values.location}
            maxLength={MAX_LOCATION}
            name="location"
            placeholder={t.locationPlaceholder}
          />
          <span className={styles.hint}>{t.locationHint}</span>
        </label>
        {state.error ? (
          <p className="status-notice status-notice--error" role="alert">
            {state.error === "missingFeeling" ? t.missingFeeling : t.failed}
          </p>
        ) : null}
        <button className={styles.primary} disabled={pending} type="submit">
          {pending ? t.checking : t.submit}
        </button>
      </form>

      <div className={styles.result} ref={resultRef} tabIndex={-1}>
        {result?.kind === "emergency" ? (
          <section className={styles.emergency} role="alert">
            <h3>{t.emergencyTitle}</h3>
            <p>{t.emergencyMessage}</p>
            <a className={styles.callButton} href="tel:999">
              {emergency.call}
            </a>
          </section>
        ) : null}

        {result?.kind === "level" ? (
          <section aria-live="polite" className={styles.level}>
            <p className={styles.levelLabel}>{t.levelLabel}</p>
            <h3>{careLevel[result.careLevel]}</h3>
            {result.careLevel === "ae" ? null : <p>{t.notAeNote}</p>}

            {result.fastest?.status === "found" ? (
              <div className={styles.fastest}>
                <h4>{t.fastestTitle}</h4>
                <p className={styles.recommendation}>{result.fastest.recommendation}</p>
                <p className={styles.hint}>{t.fastestSource}</p>
                {language === "en" ? null : <p className={styles.hint}>{t.englishOnly}</p>}
                {/* The agent answers in English, so read it with an English voice. */}
                <ReadAloudButton
                  language="en"
                  messages={readAloud}
                  text={result.fastest.recommendation}
                />
              </div>
            ) : null}
            {result.fastest?.status === "needsLocation" ? <p>{t.needsLocation}</p> : null}
            {result.fastest?.status === "unavailable" ? <p>{t.fastestUnavailable}</p> : null}
            {result.careLevel === "ae" ? <p className={styles.hint}>{t.call999Reminder}</p> : null}
          </section>
        ) : null}
      </div>
    </section>
  );
}
