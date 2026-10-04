import { EmergencyBanner } from "@/components/EmergencyBanner";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";
import { ChatPanel } from "./ChatPanel";

export default async function ChatPage() {
  const language = await getLanguage();
  const t = getMessages(language);

  return (
    <main className="page-content page-content--care">
      <EmergencyBanner />
      <section className="page-heading">
        <h1>{t.chat.title}</h1>
        <p>{t.chat.intro}</p>
      </section>
      <MedicalDisclaimer />
      {/* Keyed by language so switching language starts a fresh conversation. */}
      <ChatPanel
        emergency={t.emergency}
        key={language}
        language={language}
        messages={t.chat}
        readAloud={t.readAloud}
      />
    </main>
  );
}
