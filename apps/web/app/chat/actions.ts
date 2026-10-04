"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import type {
  ChatResult,
  ChatTurn,
  Language,
  MedicationInput,
  SymptomInput,
} from "@/lib/api/types";

// Server Functions, so the browser only talks to this app: on a phone the backend
// (localhost:8000) is not reachable. The backend validates every field.

export async function sendChat(turns: ChatTurn[], lang: Language): Promise<ChatResult | null> {
  try {
    const { data } = await api.POST("/chat", { body: { turns, lang } });
    return data ?? null;
  } catch {
    return null;
  }
}

export type SaveOutcome = {
  /** Indexes of the items that were saved, so a retry only resends the rest. */
  savedSymptoms: number[];
  savedMedications: number[];
};

export async function saveDrafts(
  symptoms: SymptomInput[],
  medications: MedicationInput[],
): Promise<SaveOutcome> {
  const outcome: SaveOutcome = { savedSymptoms: [], savedMedications: [] };
  for (const [index, body] of symptoms.entries()) {
    if (await succeeded(() => api.POST("/symptoms", { body }))) outcome.savedSymptoms.push(index);
  }
  for (const [index, body] of medications.entries()) {
    if (await succeeded(() => api.POST("/medications", { body }))) {
      outcome.savedMedications.push(index);
    }
  }
  revalidatePath("/summary");
  revalidatePath("/medications");
  return outcome;
}

async function succeeded(request: () => Promise<{ response: Response }>): Promise<boolean> {
  try {
    return (await request()).response.ok;
  } catch {
    return false;
  }
}
