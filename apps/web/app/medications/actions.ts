"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";
import {
  mapBackendErrors, parseMedicationForm, readMedicationForm,
  type MedicationFormState,
} from "@/lib/medications/form";

async function medicationMessages() {
  return getMessages(await getLanguage()).medications;
}

function isValidationDetail(detail: unknown): detail is Array<{ loc: Array<string | number>; msg: string; type: string }> {
  return Array.isArray(detail) && detail.every((item) =>
    item && Array.isArray(item.loc) && typeof item.msg === "string" && typeof item.type === "string",
  );
}

function submittedState(previous: MedicationFormState, formData: FormData): MedicationFormState {
  return { errors: {}, values: readMedicationForm(formData), revision: (previous.revision ?? 0) + 1 };
}

// Row edits are form submissions too, so they work before hydration and without JavaScript.
function changeTimeRows(state: MedicationFormState, formData: FormData): boolean {
  const intent = String(formData.get("intent") ?? "save");
  if (!state.values) return false;
  if (intent === "add-time") {
    state.values.times.push("");
    return true;
  }
  if (intent.startsWith("remove-time:")) {
    const index = Number(intent.slice("remove-time:".length));
    if (Number.isInteger(index) && index >= 0 && index < state.values.times.length) {
      state.values.times.splice(index, 1);
    }
    return true;
  }
  return false;
}

export async function createMedicationAction(
  previous: MedicationFormState,
  formData: FormData,
): Promise<MedicationFormState> {
  const state = submittedState(previous, formData);
  if (changeTimeRows(state, formData)) return state;
  const t = await medicationMessages();
  const parsed = parseMedicationForm(formData, t.form.errors);
  if ("errors" in parsed) return { ...state, errors: parsed.errors };

  try {
    const { error, response } = await api.POST("/medications", { body: parsed.input });
    if (error) {
      return { ...state, errors: response?.status === 422
        ? mapBackendErrors(isValidationDetail(error.detail) ? error.detail : undefined, t.form.errors)
        : { general: t.errorMessage } };
    }
  } catch {
    return { ...state, errors: { general: t.errorMessage } };
  }
  revalidatePath("/medications");
  redirect("/medications");
}

export async function updateMedicationAction(
  medicationId: string,
  previous: MedicationFormState,
  formData: FormData,
): Promise<MedicationFormState> {
  const state = submittedState(previous, formData);
  if (changeTimeRows(state, formData)) return state;
  const t = await medicationMessages();
  const parsed = parseMedicationForm(formData, t.form.errors);
  if ("errors" in parsed) return { ...state, errors: parsed.errors };

  try {
    const { error, response } = await api.PUT("/medications/{medicationId}", {
      params: { path: { medicationId } }, body: parsed.input,
    });
    if (error) {
      return { ...state, errors: response?.status === 422
        ? mapBackendErrors(isValidationDetail(error.detail) ? error.detail : undefined, t.form.errors)
        : { general: t.errorMessage } };
    }
  } catch {
    return { ...state, errors: { general: t.errorMessage } };
  }
  revalidatePath("/medications");
  redirect("/medications");
}

export async function deleteMedicationAction(medicationId: string): Promise<void> {
  let failed = false;
  try {
    const { error, response } = await api.DELETE("/medications/{medicationId}", {
      params: { path: { medicationId } },
    });
    // An already missing record is also a successful deletion.
    failed = Boolean(error) && response.status !== 404;
  } catch {
    failed = true;
  }
  if (failed) redirect(`/medications/${encodeURIComponent(medicationId)}/delete?error=1`);
  revalidatePath("/medications");
  redirect("/medications");
}
