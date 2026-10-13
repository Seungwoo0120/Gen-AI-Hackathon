import { InteractionWarnings } from "@/components/medications/InteractionWarnings";
import { MedicationCard } from "@/components/medications/MedicationCard";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { api } from "@/lib/api/client";
import type { InteractionCheckResult, Medication } from "@/lib/api/types";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";
import styles from "./page.module.css";

async function loadMedications(): Promise<Medication[] | null> {
  try {
    const { data } = await api.GET("/medications", { cache: "no-store" });
    return data ?? null;
  } catch {
    return null;
  }
}

async function loadInteractions(medications: Medication[]): Promise<InteractionCheckResult | null> {
  if (medications.length < 2) return null;
  try {
    const { data } = await api.POST("/interactions/check", {
      body: { medications: medications.map((medication) => medication.name) },
      cache: "no-store",
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export default async function MedicationsPage() {
  const language = await getLanguage();
  const t = getMessages(language);
  const medications = await loadMedications();
  const interactions = medications ? await loadInteractions(medications) : null;

  return (
    <main className="page-content">
      <section className="page-heading">
        <h1>{t.medications.title}</h1>
        <p>{t.medications.intro}</p>
      </section>
      <MedicalDisclaimer />

      {medications === null ? (
        <section className="status-notice status-notice--error" role="alert">
          <h2>{t.medications.errorTitle}</h2>
          <p>{t.medications.errorMessage}</p>
          <a className="button-link" href="/medications">
            {t.medications.retry}
          </a>
        </section>
      ) : medications.length === 0 ? (
        <section className="status-notice">
          <p>{t.medications.emptyBody}</p>
          <a className="button-link" href="/medications/new">
            {t.medications.addButton}
          </a>
        </section>
      ) : (
        <>
          {interactions ? (
            <InteractionWarnings
              language={language}
              messages={t.medications.interactions}
              readAloudMessages={t.readAloud}
              result={interactions}
            />
          ) : medications.length >= 2 ? (
            <section className="status-notice status-notice--warning" role="alert">
              <p>{t.medications.interactions.unavailable}</p>
              <a className="button-link" href="/medications">{t.medications.retry}</a>
            </section>
          ) : null}

          <a className="button-link" href="/medications/new">
            {t.medications.addButton}
          </a>

          <ul aria-label={t.medications.listLabel} className={styles.list}>
            {medications.map((medication) => (
              <MedicationCard key={medication.id} medication={medication} messages={t.medications} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
