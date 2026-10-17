import type { Language } from "@/lib/api/types";

const squash = (text: string) => text.replace(/\s+/g, "").toLowerCase();

/**
 * Add a "final" recognition result to what was heard so far.
 *
 * Android Chrome sends empty and partial finals before the real one, and may repeat
 * a final after a restart, so: empty results are dropped, a longer version of the
 * last segment replaces it, and a repeat or shorter copy of it is ignored.
 */
export function mergeFinal(segments: readonly string[], text: string): string[] {
  const next = text.trim();
  if (!next) return [...segments];
  const last = segments.at(-1);
  if (last !== undefined) {
    if (squash(next).startsWith(squash(last))) return [...segments.slice(0, -1), next];
    if (squash(last).startsWith(squash(next))) return [...segments];
  }
  return [...segments, next];
}

/** Chinese is written without spaces between phrases; English needs them. */
export function joinSegments(segments: readonly string[], language: Language): string {
  return segments.join(language === "zh-Hant" ? "" : " ").trim();
}
