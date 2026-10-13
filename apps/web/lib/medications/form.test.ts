import { describe, expect, it } from "vitest";
import { mapBackendErrors, parseMedicationForm, type MedicationFormMessages } from "./form";

const messages: MedicationFormMessages = {
  nameRequired: "Enter a name.",
  nameTooLong: "Name must be 200 characters or fewer.",
  doseTooLong: "Dose must be 100 characters or fewer.",
  notesTooLong: "Notes must be 1000 characters or fewer.",
  timesInvalid: "Enter valid times.",
  generic: "Please fix the errors below and try again.",
};

function formData(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("parseMedicationForm", () => {
  it("parses a full valid submission", () => {
    const result = parseMedicationForm(
      formData([
        ["name", "Panadol"],
        ["dose", "500 mg"],
        ["times", "08:00"],
        ["times", "20:00"],
        ["daysOfWeek", "3"],
        ["daysOfWeek", "1"],
        ["notes", "Take with food"],
      ]),
      messages,
    );

    expect(result).toEqual({
      input: {
        name: "Panadol",
        dose: "500 mg",
        notes: "Take with food",
        schedule: { times: ["08:00", "20:00"], daysOfWeek: [1, 3] },
      },
    });
  });

  it("requires a name", () => {
    const result = parseMedicationForm(formData([["name", "  "]]), messages);
    expect(result).toEqual({ errors: { name: "Enter a name." } });
  });

  it("rejects a name over 200 characters", () => {
    const result = parseMedicationForm(formData([["name", "a".repeat(201)]]), messages);
    expect(result).toEqual({ errors: { name: "Name must be 200 characters or fewer." } });
  });

  it("rejects a dose over 100 characters", () => {
    const result = parseMedicationForm(
      formData([
        ["name", "Panadol"],
        ["dose", "a".repeat(101)],
      ]),
      messages,
    );
    expect(result).toEqual({ errors: { dose: "Dose must be 100 characters or fewer." } });
  });

  it("rejects notes over 1000 characters", () => {
    const result = parseMedicationForm(
      formData([
        ["name", "Panadol"],
        ["notes", "a".repeat(1001)],
      ]),
      messages,
    );
    expect(result).toEqual({ errors: { notes: "Notes must be 1000 characters or fewer." } });
  });

  it("rejects an invalid time", () => {
    const result = parseMedicationForm(
      formData([
        ["name", "Panadol"],
        ["times", "25:00"],
      ]),
      messages,
    );
    expect(result).toEqual({ errors: { times: "Enter valid times." } });
  });

  it("turns empty dose and notes into null", () => {
    const result = parseMedicationForm(
      formData([
        ["name", "Panadol"],
        ["dose", "  "],
        ["notes", ""],
      ]),
      messages,
    );
    expect(result).toEqual({
      input: { name: "Panadol", dose: null, notes: null, schedule: null },
    });
  });

  it("drops blank time rows", () => {
    const result = parseMedicationForm(
      formData([
        ["name", "Panadol"],
        ["times", "08:00"],
        ["times", ""],
      ]),
      messages,
    );
    expect(result).toEqual({
      input: { name: "Panadol", dose: null, notes: null, schedule: { times: ["08:00"], daysOfWeek: null } },
    });
  });

  it("preserves selected days when no times are set", () => {
    const result = parseMedicationForm(
      formData([
        ["name", "Panadol"],
        ["daysOfWeek", "2"],
      ]),
      messages,
    );
    expect(result).toEqual({
      input: { name: "Panadol", dose: null, notes: null, schedule: { times: [], daysOfWeek: [2] } },
    });
  });

  it("treats no days checked as every day (null)", () => {
    const result = parseMedicationForm(
      formData([
        ["name", "Panadol"],
        ["times", "08:00"],
      ]),
      messages,
    );
    expect(result).toEqual({
      input: { name: "Panadol", dose: null, notes: null, schedule: { times: ["08:00"], daysOfWeek: null } },
    });
  });
});

describe("mapBackendErrors", () => {
  it("maps a field-level validation error by its last loc segment", () => {
    const errors = mapBackendErrors(
      [{ loc: ["body", "name"], msg: "String should have at least 1 character", type: "string_too_short" }],
      messages,
    );
    expect(errors).toEqual({ name: "String should have at least 1 character" });
  });

  it("maps nested schedule time errors to the times field", () => {
    const errors = mapBackendErrors(
      [{ loc: ["body", "schedule", "times", 0], msg: "Invalid time", type: "string_pattern_mismatch" }],
      messages,
    );
    expect(errors).toEqual({ times: "Invalid time" });
  });

  it("falls back to a generic error when detail is missing", () => {
    expect(mapBackendErrors(undefined, messages)).toEqual({ general: messages.generic });
  });

  it("falls back to a generic error when detail is empty", () => {
    expect(mapBackendErrors([], messages)).toEqual({ general: messages.generic });
  });

  it("falls back to a generic error when no field maps", () => {
    const errors = mapBackendErrors([{ loc: ["body", "mystery"], msg: "oops", type: "x" }], messages);
    expect(errors).toEqual({ general: messages.generic });
  });
});
