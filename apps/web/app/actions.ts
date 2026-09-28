"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { resolveLanguage } from "@/lib/i18n";

export async function setLanguage(formData: FormData) {
  const language = resolveLanguage(String(formData.get("lang") ?? ""));
  const cookieStore = await cookies();

  cookieStore.set("lang", language, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
