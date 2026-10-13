import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";

export default async function MedicationsLoading() {
  const language = await getLanguage();
  const t = getMessages(language);

  return (
    <main className="page-content">
      <section className="page-heading">
        <h1>{t.medications.title}</h1>
        <p>{t.medications.intro}</p>
      </section>
      <MedicalDisclaimer />
      <p className="status-notice" role="status">
        {t.medications.loading}
      </p>
    </main>
  );
}
