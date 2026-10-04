import type { ChatResult, ChatTurn, MedicationInput, SymptomInput } from "@/lib/api/types";

// Mirrors the contract: POST /chat accepts at most 8 turns.
export const MAX_TURNS = 8;

export function canAnswerMore(turns: readonly ChatTurn[]): boolean {
  return turns.length < MAX_TURNS;
}

type Editable = { key: string; keep: boolean };
export type EditableSymptom = SymptomInput & Editable;
export type EditableMedication = MedicationInput & Editable;

export function toEditable(result: ChatResult): {
  symptoms: EditableSymptom[];
  medications: EditableMedication[];
} {
  return {
    symptoms: result.symptoms.map((item, i) => ({ ...item, key: `s${i}`, keep: true })),
    medications: result.medications.map((item, i) => ({ ...item, key: `m${i}`, keep: true })),
  };
}

function withoutEditing<T extends Editable>(item: T): Omit<T, keyof Editable> {
  const { key, keep, ...rest } = item;
  void key;
  void keep;
  return rest;
}

const blankToNull = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

/** What the user confirmed: kept items with a name, ready for POST /symptoms and /medications. */
export function toSave(
  symptoms: readonly EditableSymptom[],
  medications: readonly EditableMedication[],
): { symptoms: SymptomInput[]; medications: MedicationInput[] } {
  return {
    symptoms: symptoms
      .filter((item) => item.keep && item.name.trim())
      .map(withoutEditing)
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        details: blankToNull(item.details),
        source: "chat" as const,
      })),
    medications: medications
      .filter((item) => item.keep && item.name.trim())
      .map(withoutEditing)
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        dose: blankToNull(item.dose),
      })),
  };
}
