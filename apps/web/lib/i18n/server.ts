import { cookies } from "next/headers";
import { resolveLanguage } from ".";

export async function getLanguage() {
  const cookieStore = await cookies();
  return resolveLanguage(cookieStore.get("lang")?.value);
}
