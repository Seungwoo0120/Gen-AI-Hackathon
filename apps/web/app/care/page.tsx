import { EmergencyBanner } from "@/components/EmergencyBanner";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { api } from "@/lib/api/client";
import type { AeWaitTimesResponse, Language } from "@/lib/api/types";
import { getMessages } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/i18n/localized";
import { getLanguage } from "@/lib/i18n/server";

async function loadWaitTimes(): Promise<AeWaitTimesResponse | null> {
  try {
    const { data } = await api.GET("/ae/wait-times", { cache: "no-store" });
    return data ?? null;
  } catch {
    return null;
  }
}

function formatUpdateTime(timestamp: string, language: Language): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(timestamp));
}

export default async function CarePage() {
  const language = await getLanguage();
  const t = getMessages(language);
  const waitTimes = await loadWaitTimes();

  return (
    <main className="page-content page-content--care">
      <EmergencyBanner />
      <section className="page-heading">
        <h1>{t.care.title}</h1>
        <p>{t.care.intro}</p>
      </section>
      <MedicalDisclaimer />

      {waitTimes ? (
        <>
          {waitTimes.stale ? (
            <p className="status-notice status-notice--warning" role="status">
              {t.care.stale}
            </p>
          ) : null}
          <ul aria-label={t.care.listLabel} className="hospital-list">
            {waitTimes.hospitals.map((hospital) => (
              <li className="hospital-card" key={hospital.hospitalId}>
                <h2>{getLocalizedText(hospital.name, language)}</h2>
                <p className="hospital-card__wait">
                  {getLocalizedText(hospital.waitTimeText, language)}
                </p>
                <p className="hospital-card__updated">
                  {t.care.updated}: {formatUpdateTime(waitTimes.sourceUpdatedAt, language)}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <section className="status-notice status-notice--error" role="alert">
          <h2>{t.care.errorTitle}</h2>
          <p>{t.care.errorMessage}</p>
          <a className="button-link" href="/care">
            {t.care.retry}
          </a>
        </section>
      )}
    </main>
  );
}
