import type { Language } from "@/lib/api/types";
import { en, type Messages } from "./en";
import { zhHant } from "./zh-Hant";

// All user-facing text comes from here, never inline in components.
const messages: Record<Language, Messages> = {
  en,
  "zh-Hant": zhHant,
};

export const defaultLanguage: Language = "en";

export function getMessages(lang: Language = defaultLanguage): Messages {
  return messages[lang];
}

export function resolveLanguage(value: string | undefined): Language {
  return value === "zh-Hant" || value === "en" ? value : defaultLanguage;
}

export type { Messages };
