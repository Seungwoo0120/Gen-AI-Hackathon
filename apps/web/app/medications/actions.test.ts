import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  post: vi.fn(), put: vi.fn(), delete: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ api: { POST: mocks.post, PUT: mocks.put, DELETE: mocks.delete } }));
vi.mock("@/lib/i18n/server", () => ({ getLanguage: async () => "en" }));
vi.mock("@/lib/i18n", () => import("../../lib/i18n"));
vi.mock("@/lib/medications/form", () => import("../../lib/medications/form"));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));

import { createMedicationAction, deleteMedicationAction, updateMedicationAction } from "./actions";

function submission(dose = "500 mg") {
  const data = new FormData();
  for (const [key, value] of [
    ["name", " Panadol "], ["dose", dose], ["notes", "Take with food"],
    ["times", "08:00"], ["times", "20:00"], ["daysOfWeek", "1"],
  ]) data.append(key, value);
  return data;
}

const values = {
  name: " Panadol ", dose: "500 mg", notes: "Take with food",
  times: ["08:00", "20:00"], daysOfWeek: ["1"],
};

describe("medication actions", () => {
  beforeEach(() => vi.resetAllMocks());

  it("keeps all submitted values after a validation error", async () => {
    const dose = "a".repeat(101);
    const state = await createMedicationAction({ errors: {} }, submission(dose));
    expect(state).toMatchObject({ errors: { dose: expect.any(String) }, values: { ...values, dose } });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each(["create", "update"])("keeps values and shows a service error when %s cannot reach the API", async (operation) => {
    mocks.post.mockRejectedValue(new TypeError("fetch failed"));
    mocks.put.mockRejectedValue(new TypeError("fetch failed"));
    const state = operation === "create"
      ? await createMedicationAction({ errors: {} }, submission())
      : await updateMedicationAction("demo-id", { errors: {} }, submission());
    expect(state).toMatchObject({ errors: { general: expect.any(String) }, values });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("adds a time row without saving, keeping the other inputs", async () => {
    const data = submission(); data.set("intent", "add-time");
    const state = await createMedicationAction({ errors: {} }, data);
    expect(state).toMatchObject({ errors: {}, values: { ...values, times: ["08:00", "20:00", ""] } });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("removes the requested time row without saving", async () => {
    const data = submission(); data.set("intent", "remove-time:0");
    const state = await updateMedicationAction("demo-id", { errors: {} }, data);
    expect(state).toMatchObject({ errors: {}, values: { ...values, times: ["20:00"] } });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("does not present a failed delete as success", async () => {
    mocks.delete.mockResolvedValue({ error: { detail: "unavailable" }, response: new Response(null, { status: 500 }) });
    await expect(deleteMedicationAction("demo-id")).rejects.toThrow("redirect:/medications/demo-id/delete?error=1");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("shows a retry page when deleting cannot reach the API", async () => {
    mocks.delete.mockRejectedValue(new TypeError("fetch failed"));
    await expect(deleteMedicationAction("demo-id")).rejects.toThrow("redirect:/medications/demo-id/delete?error=1");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("accepts deletion of an already missing medication", async () => {
    mocks.delete.mockResolvedValue({ error: { detail: "not found" }, response: new Response(null, { status: 404 }) });
    await expect(deleteMedicationAction("demo-id")).rejects.toThrow("redirect:/medications");
    expect(mocks.revalidate).toHaveBeenCalledWith("/medications");
  });

  it("saves a valid medication and redirects after revalidation", async () => {
    mocks.post.mockResolvedValue({ data: { id: "demo-id" } });
    await expect(createMedicationAction({ errors: {} }, submission())).rejects.toThrow("redirect:/medications");
    expect(mocks.post).toHaveBeenCalledWith("/medications", { body: {
      name: "Panadol", dose: "500 mg", notes: "Take with food",
      schedule: { times: ["08:00", "20:00"], daysOfWeek: [1] },
    } });
    expect(mocks.revalidate).toHaveBeenCalledWith("/medications");
  });
});
