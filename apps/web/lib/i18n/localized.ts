import type { Language, LocalizedText } from "@/lib/api/types";

export function getLocalizedText(text: LocalizedText, language: Language): string {
  if (language === "zh-Hant" && text.zhHant?.trim()) {
    return text.zhHant;
  }
  return text.en;
}
