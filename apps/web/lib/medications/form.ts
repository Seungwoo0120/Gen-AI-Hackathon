import type { MedicationInput } from "@/lib/api/types";

export type MedicationFormErrors = {
  name?: string;
  dose?: string;
  times?: string;
  notes?: string;
  general?: string;
};

export type MedicationFormMessages = {
  nameRequired: string;
  nameTooLong: string;
  doseTooLong: string;
  notesTooLong: string;
  timesInvalid: string;
  generic: string;
};

export type MedicationFormValues = {
  name: string;
  dose: string;
  notes: string;
  times: string[];
  daysOfWeek: string[];
};

export type MedicationFormState = {
  errors: MedicationFormErrors;
  values?: MedicationFormValues;
  revision?: number;
};

export function readMedicationForm(formData: FormData): MedicationFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    dose: String(formData.get("dose") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    times: formData.getAll("times").map(String),
    daysOfWeek: formData.getAll("daysOfWeek").map(String),
  };
}

export const emptyMedicationFormState: MedicationFormState = { errors: {} };

const NAME_MAX_LENGTH = 200;
const DOSE_MAX_LENGTH = 100;
const NOTES_MAX_LENGTH = 1000;
const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function trimmedOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

/** Parses a medications form submission into a validated MedicationInput, or field errors. */
export function parseMedicationForm(
  formData: FormData,
  messages: MedicationFormMessages,
): { input: MedicationInput } | { errors: MedicationFormErrors } {
  const errors: MedicationFormErrors = {};

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    errors.name = messages.nameRequired;
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = messages.nameTooLong;
  }

  const dose = trimmedOrNull(formData.get("dose"));
  if (dose && dose.length > DOSE_MAX_LENGTH) {
    errors.dose = messages.doseTooLong;
  }

  const notes = trimmedOrNull(formData.get("notes"));
  if (notes && notes.length > NOTES_MAX_LENGTH) {
    errors.notes = messages.notesTooLong;
  }

  const times = formData
    .getAll("times")
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);
  if (times.some((value) => !TIME_PATTERN.test(value))) {
    errors.times = messages.timesInvalid;
  }

  const daysOfWeek = formData
    .getAll("daysOfWeek")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7)
    .sort((a, b) => a - b);

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    input: {
      name,
      dose,
      notes,
      schedule: times.length > 0 || daysOfWeek.length > 0
        ? { times, daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : null } : null,
    },
  };
}

type BackendValidationDetail = { loc: Array<string | number>; msg: string; type: string };

/** Maps FastAPI's 422 validation detail array to form field errors. */
export function mapBackendErrors(
  detail: BackendValidationDetail[] | undefined,
  messages: MedicationFormMessages,
): MedicationFormErrors {
  const errors: MedicationFormErrors = {};

  for (const item of detail ?? []) {
    if (item.loc.includes("schedule")) errors.times = item.msg;
    else if (item.loc.includes("name")) errors.name = item.msg;
    else if (item.loc.includes("dose")) errors.dose = item.msg;
    else if (item.loc.includes("notes")) errors.notes = item.msg;
  }

  if (Object.keys(errors).length === 0) {
    errors.general = messages.generic;
  }

  return errors;
}
