import type { Metadata } from "next";
import { VoiceTest } from "./VoiceTest";

// Temporary spike page for checking speech support on real phones.
// Not linked from navigation; delete once the chat screen is built.
export const metadata: Metadata = { robots: { index: false } };

export default function VoiceTestPage() {
  return <VoiceTest />;
}
