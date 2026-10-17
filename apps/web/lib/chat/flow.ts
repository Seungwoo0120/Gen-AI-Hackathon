import type { ChatQuestion, ChatResult, ChatTurn } from "@/lib/api/types";
import { canAnswerMore } from "./drafts";

// Mirror the contract limits on POST /chat.
export const MAX_ANSWER = 1000;
export const MAX_TOTAL = 4000;

export type Step =
  | { kind: "emergency" }
  | { kind: "failed" }
  | { kind: "ask"; question: ChatQuestion }
  | { kind: "review" };

/** What the screen does after a /chat reply. An emergency always wins. */
export function nextStep(result: ChatResult | null, turns: readonly ChatTurn[]): Step {
  if (result?.emergency.emergency) return { kind: "emergency" };
  // No reply, or nothing could be organised: offer a retry, never "nothing found".
  if (!result || result.extractionFailed) return { kind: "failed" };
  const total = turns.reduce((sum, turn) => sum + turn.answer.length, 0);
  // Stop asking when one more full answer would break the contract limits.
  if (result.nextQuestion && canAnswerMore(turns) && total <= MAX_TOTAL - MAX_ANSWER) {
    return { kind: "ask", question: result.nextQuestion };
  }
  return { kind: "review" };
}
