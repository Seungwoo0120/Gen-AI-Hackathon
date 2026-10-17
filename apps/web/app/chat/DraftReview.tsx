"use client";

import type { Language } from "@/lib/api/types";
import type { EditableMedication, EditableSymptom } from "@/lib/chat/drafts";
import type { Messages } from "@/lib/i18n";
import styles from "./chat.module.css";

type Props = {
  language: Language;
  messages: Messages["chat"]["review"];
  symptoms: EditableSymptom[];
  medications: EditableMedication[];
  onSymptomsChange: (items: EditableSymptom[]) => void;
  onMedicationsChange: (items: EditableMedication[]) => void;
  onSave: () => void;
  saving: boolean;
  saveFailed: boolean;
};

const hongKongClock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Hong_Kong",
});

function formatStart(value: string, language: Language): string {
  const date = new Date(value);
  // A vague start ("since last week") is stored as midnight: show the date alone.
  const dateOnly = hongKongClock.format(date) === "00:00";
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: dateOnly ? undefined : "short",
    timeZone: "Asia/Hong_Kong",
  }).format(date);
}

function update<T extends { key: string }>(items: T[], key: string, change: Partial<T>): T[] {
  return items.map((item) => (item.key === key ? { ...item, ...change } : item));
}

/** The user checks and corrects the drafts. Nothing is saved until they tap Save. */
export function DraftReview({
  language,
  messages: t,
  symptoms,
  medications,
  onSymptomsChange,
  onMedicationsChange,
  onSave,
  saving,
  saveFailed,
}: Props) {
  const empty = symptoms.length === 0 && medications.length === 0;
  const anyKept = [...symptoms, ...medications].some((item) => item.keep && item.name.trim());

  return (
    <section aria-labelledby="review-title" className={styles.review}>
      <h2 id="review-title">{t.title}</h2>
      {empty ? (
        <p>{t.nothing}</p>
      ) : (
        <>
          <p>{t.intro}</p>

          {symptoms.length > 0 ? (
            <fieldset className={styles.group}>
              <legend>{t.symptoms}</legend>
              {symptoms.map((item) => (
                <div
                  className={item.keep ? styles.card : `${styles.card} ${styles.dropped}`}
                  key={item.key}
                >
                  <label className={styles.keep}>
                    <input
                      checked={item.keep}
                      onChange={(e) =>
                        onSymptomsChange(update(symptoms, item.key, { keep: e.target.checked }))
                      }
                      type="checkbox"
                    />
                    {t.keep}
                  </label>
                  <label className={styles.field}>
                    {t.name}
                    <input
                      maxLength={200}
                      onChange={(e) =>
                        onSymptomsChange(update(symptoms, item.key, { name: e.target.value }))
                      }
                      value={item.name}
                    />
                  </label>
                  <label className={styles.field}>
                    {t.severity}
                    <select
                      onChange={(e) =>
                        onSymptomsChange(
                          update(symptoms, item.key, {
                            severity: e.target.value ? Number(e.target.value) : null,
                          }),
                        )
                      }
                      value={item.severity ?? ""}
                    >
                      <option value="">{t.severityUnknown}</option>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    {t.details}
                    <textarea
                      maxLength={2000}
                      onChange={(e) =>
                        onSymptomsChange(update(symptoms, item.key, { details: e.target.value }))
                      }
                      rows={2}
                      value={item.details ?? ""}
                    />
                  </label>
                  {item.startedAt ? (
                    <p className={styles.meta}>
                      {t.started}: {formatStart(item.startedAt, language)}
                    </p>
                  ) : null}
                </div>
              ))}
            </fieldset>
          ) : null}

          {medications.length > 0 ? (
            <fieldset className={styles.group}>
              <legend>{t.medications}</legend>
              {medications.map((item) => (
                <div
                  className={item.keep ? styles.card : `${styles.card} ${styles.dropped}`}
                  key={item.key}
                >
                  <label className={styles.keep}>
                    <input
                      checked={item.keep}
                      onChange={(e) =>
                        onMedicationsChange(
                          update(medications, item.key, { keep: e.target.checked }),
                        )
                      }
                      type="checkbox"
                    />
                    {t.keep}
                  </label>
                  <label className={styles.field}>
                    {t.name}
                    <input
                      maxLength={200}
                      onChange={(e) =>
                        onMedicationsChange(update(medications, item.key, { name: e.target.value }))
                      }
                      value={item.name}
                    />
                  </label>
                  <label className={styles.field}>
                    {t.dose}
                    <input
                      maxLength={100}
                      onChange={(e) =>
                        onMedicationsChange(update(medications, item.key, { dose: e.target.value }))
                      }
                      value={item.dose ?? ""}
                    />
                  </label>
                  {item.schedule?.times.length ? (
                    <p className={styles.meta}>
                      {t.times}: {item.schedule.times.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </fieldset>
          ) : null}

          {saveFailed ? (
            <p className="status-notice status-notice--error" role="alert">
              {t.saveError}
            </p>
          ) : null}
          <button
            className={styles.primary}
            disabled={saving || !anyKept}
            onClick={onSave}
            type="button"
          >
            {saving ? t.saving : t.save}
          </button>
        </>
      )}
    </section>
  );
}
