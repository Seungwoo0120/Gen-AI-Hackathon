import { EmergencyBanner } from "@/components/EmergencyBanner";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";

export default async function CareLoading() {
  const language = await getLanguage();
  const t = getMessages(language);

  return (
    <main className="page-content page-content--care">
      <EmergencyBanner />
      <section className="page-heading">
        <h1>{t.care.title}</h1>
        <p>{t.care.intro}</p>
      </section>
      <MedicalDisclaimer />
      <p className="status-notice" role="status">
        {t.care.loading}
      </p>
    </main>
  );
}
