import { describe, expect, it } from "vitest";
import { getMessages, resolveLanguage } from ".";
import { en } from "./en";
import { getLocalizedText } from "./localized";
import { zhHant } from "./zh-Hant";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
}

describe("i18n", () => {
  it("has no empty messages in any language", () => {
    for (const messages of [en, zhHant]) {
      for (const [key, value] of Object.entries(flatten(messages))) {
        expect(value.trim(), key).not.toBe("");
      }
    }
  });

  it("falls back to English by default", () => {
    expect(getMessages().appName).toBe(en.appName);
  });

  it("returns Traditional Chinese for zh-Hant", () => {
    expect(getMessages("zh-Hant").careLevel.call_999).toContain("999");
  });

  it("accepts supported language cookie values", () => {
    expect(resolveLanguage("en")).toBe("en");
    expect(resolveLanguage("zh-Hant")).toBe("zh-Hant");
  });

  it("falls back to English for missing or unknown cookie values", () => {
    expect(resolveLanguage(undefined)).toBe("en");
    expect(resolveLanguage("fr")).toBe("en");
  });

  it("uses English when localized source text is unavailable", () => {
    const text = { en: "Around 2 hours" };
    expect(getLocalizedText(text, "zh-Hant")).toBe(text.en);
  });

  it("uses Traditional Chinese source text when available", () => {
    const text = { en: "Around 2 hours", zhHant: "約兩小時" };
    expect(getLocalizedText(text, "zh-Hant")).toBe(text.zhHant);
  });
});
