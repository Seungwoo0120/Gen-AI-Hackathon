import { describe, expect, it } from "vitest";
import { getMessages } from ".";
import { en } from "./en";
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
});
