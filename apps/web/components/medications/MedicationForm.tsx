"use client";

import { useActionState } from "react";
import type { Medication } from "@/lib/api/types";
import type { Messages } from "@/lib/i18n";
import { type MedicationFormState } from "@/lib/medications/form";
import styles from "./MedicationForm.module.css";

type FormMessages = Messages["medications"]["form"];

type Props = {
  action: (state: MedicationFormState, formData: FormData) => Promise<MedicationFormState>;
  medication?: Medication;
  messages: FormMessages;
  dayNames: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string>;
  cancelHref: string;
  formHref: string;
};

const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

export function MedicationForm({ action, medication, messages, dayNames, cancelHref, formHref }: Props) {
  const initialState: MedicationFormState = {
    errors: {},
    values: {
      name: medication?.name ?? "",
      dose: medication?.dose ?? "",
      notes: medication?.notes ?? "",
      times: medication?.schedule?.times.length ? medication.schedule.times : [""],
      daysOfWeek: (medication?.schedule?.daysOfWeek ?? []).map(String),
    },
  };
  const [state, formAction, pending] = useActionState(action, initialState, formHref);
  const values = state.values ?? initialState.values!;
  const selectedDays = new Set(values.daysOfWeek);

  return (
    <form action={formAction} className={styles.form} key={state.revision ?? 0} noValidate>
      <button hidden name="intent" type="submit" value="save" />
      {state.errors.general ? (
        <p className="status-notice status-notice--error" role="alert">
          {state.errors.general}
        </p>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="medication-name">{messages.nameLabel}</label>
        <input
          aria-describedby={state.errors.name ? "medication-name-error" : undefined}
          aria-invalid={Boolean(state.errors.name)}
          defaultValue={values.name}
          id="medication-name"
          name="name"
          required
          type="text"
        />
        {state.errors.name ? (
          <p className={styles.fieldError} id="medication-name-error" role="alert">
            {state.errors.name}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="medication-dose">{messages.doseLabel}</label>
        <input
          aria-describedby={state.errors.dose ? "medication-dose-error" : "medication-dose-hint"}
          aria-invalid={Boolean(state.errors.dose)}
          defaultValue={values.dose}
          id="medication-dose"
          name="dose"
          type="text"
        />
        <p className={styles.hint} id="medication-dose-hint">
          {messages.doseHint}
        </p>
        {state.errors.dose ? (
          <p className={styles.fieldError} id="medication-dose-error" role="alert">
            {state.errors.dose}
          </p>
        ) : null}
      </div>

      <fieldset className={styles.field}>
        <legend>{messages.timesLabel}</legend>
        {values.times.map((time, index) => (
          <div className={styles.timeRow} key={index}>
            <input
              aria-label={`${messages.timesLabel} ${index + 1}`}
              name="times"
              defaultValue={time}
              type="time"
            />
            <button
              aria-label={`${messages.removeTime} ${index + 1}`}
              className={styles.rowButton}
              name="intent"
              value={`remove-time:${index}`}
              disabled={pending}
              type="submit"
            >
              {messages.removeTime}
            </button>
          </div>
        ))}
        <button
          className={styles.rowButton}
          name="intent"
          value="add-time"
          disabled={pending}
          type="submit"
        >
          {messages.addTime}
        </button>
        {state.errors.times ? (
          <p className={styles.fieldError} role="alert">
            {state.errors.times}
          </p>
        ) : null}
      </fieldset>

      <fieldset className={styles.field}>
        <legend>{messages.daysLabel}</legend>
        <p className={styles.hint}>{messages.daysHint}</p>
        <div className={styles.days}>
          {DAY_VALUES.map((day) => (
            <label className={styles.dayOption} key={day}>
              <input defaultChecked={selectedDays.has(String(day))} name="daysOfWeek" type="checkbox" value={day} />
              {dayNames[day]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="medication-notes">{messages.notesLabel}</label>
        <textarea
          aria-describedby={state.errors.notes ? "medication-notes-error" : undefined}
          aria-invalid={Boolean(state.errors.notes)}
          defaultValue={values.notes}
          id="medication-notes"
          name="notes"
          rows={3}
        />
        {state.errors.notes ? (
          <p className={styles.fieldError} id="medication-notes-error" role="alert">
            {state.errors.notes}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <a className={styles.cancelLink} href={cancelHref}>
          {messages.cancel}
        </a>
        <button className={styles.submit} disabled={pending} name="intent" type="submit" value="save">
          {messages.save}
        </button>
      </div>
    </form>
  );
}
