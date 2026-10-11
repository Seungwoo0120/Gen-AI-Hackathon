import Link from "next/link";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { PrintButton } from "@/components/summary/PrintButton";
import { api } from "@/lib/api/client";
import type { DoctorSummary } from "@/lib/api/types";
import { getMessages } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/i18n/localized";
import { getLanguage } from "@/lib/i18n/server";
import { parseRange, rangeFrom, summaryRanges, type SummaryRange } from "@/lib/summary/range";
import {
  fill,
  formatDate,
  formatDateTime,
  joinList,
  readAloudText,
  scheduleText,
} from "@/lib/summary/text";
import styles from "./summary.module.css";

async function loadSummary(range: SummaryRange): Promise<DoctorSummary | null> {
  try {
    const { data } = await api.GET("/summary", {
      params: { query: { from: rangeFrom(range) } },
      cache: "no-store",
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export default async function SummaryPage({ searchParams }: PageProps<"/summary">) {
  const language = await getLanguage();
  const t = getMessages(language);
  const s = t.summary;
  const range = parseRange((await searchParams).range);
  const summary = await loadSummary(range);
  const isEmpty = summary !== null && !summary.medications.length && !summary.symptoms.length;

  return (
    <main className={`page-content ${styles.page}`}>
      <EmergencyBanner />
      <header className="page-heading">
        <p className={styles.appName}>{t.appName}</p>
        <h1>{s.title}</h1>
        <p>
          {s.ranges[range]}
          {summary?.from ? ` ${fill(s.since, { date: formatDate(summary.from, language) })}` : null}
        </p>
        {summary ? (
          <p>
            {fill(s.labelValue, {
              label: s.generated,
              value: formatDateTime(summary.generatedAt, language),
            })}
          </p>
        ) : null}
      </header>

      <nav aria-label={s.rangeLabel} className={styles.ranges}>
        {summaryRanges.map((option) => (
          <Link
            aria-current={option === range ? "page" : undefined}
            href={`/summary?range=${option}`}
            key={option}
          >
            {s.ranges[option]}
          </Link>
        ))}
      </nav>

      {summary === null ? (
        <section className="status-notice status-notice--error" role="alert">
          <h2>{s.errorTitle}</h2>
          <p>{s.errorMessage}</p>
          <a className="button-link" href={`/summary?range=${range}`}>
            {s.retry}
          </a>
        </section>
      ) : isEmpty ? (
        <section className="status-notice">
          <h2>{s.emptyTitle}</h2>
          <p>{s.emptyMessage}</p>
          <div className={styles.links}>
            <Link className="button-link" href="/chat">
              {s.goToChat}
            </Link>
            <Link className="button-link" href="/medications">
              {s.goToMedications}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className={styles.actions}>
            <PrintButton className={styles.printButton} label={s.print} />
            <ReadAloudButton
              language={language}
              messages={t.readAloud}
              text={readAloudText(summary, s.ranges[range], language, s)}
            />
          </div>

          <section aria-labelledby="summary-medications" className={styles.section}>
            <h2 id="summary-medications">{s.medications}</h2>
            {summary.medications.length ? (
              <ul className={styles.list}>
                {summary.medications.map((medication) => {
                  const schedule = scheduleText(medication.schedule, language, s);
                  return (
                    <li className={styles.item} key={medication.id}>
                      <h3>{medication.name}</h3>
                      {medication.dose ? (
                        <p>{fill(s.labelValue, { label: s.dose, value: medication.dose })}</p>
                      ) : null}
                      {schedule ? <p>{schedule}</p> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>{s.noMedications}</p>
            )}
          </section>

          {summary.interactionWarnings.length ? (
            <section aria-labelledby="summary-warnings" className={styles.section}>
              <h2 id="summary-warnings">{s.warnings}</h2>
              <ul className={styles.list}>
                {summary.interactionWarnings.map((warning) => (
                  <li
                    className={`${styles.item} ${styles.warning}`}
                    key={`${warning.kind}:${warning.medications.join("+")}`}
                  >
                    <h3>
                      {warning.ingredient
                        ? fill(s.labelValue, {
                            label: s.warningKind[warning.kind],
                            value: warning.ingredient,
                          })
                        : s.warningKind[warning.kind]}
                    </h3>
                    <p>
                      {fill(s.labelValue, {
                        label: s.warningSeverity,
                        value: s.severity[warning.severity],
                      })}
                    </p>
                    <p>
                      {fill(s.labelValue, {
                        label: s.involved,
                        value: joinList(warning.medications, language),
                      })}
                    </p>
                    <p>{getLocalizedText(warning.summary, language)}</p>
                    <p className={styles.meta}>{s.sources}</p>
                    <ul className={styles.sources}>
                      {warning.sources.map((source) => (
                        <li key={source.title}>
                          {source.url ? <a href={source.url}>{source.title}</a> : source.title}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="summary-symptoms" className={styles.section}>
            <h2 id="summary-symptoms">{s.symptoms}</h2>
            {summary.symptoms.length ? (
              <ul className={styles.list}>
                {summary.symptoms.map((symptom) => (
                  <li className={styles.item} key={symptom.id}>
                    <p className={styles.meta}>
                      <time dateTime={symptom.recordedAt}>
                        {formatDateTime(symptom.recordedAt, language)}
                      </time>
                      {symptom.source === "chat" ? (
                        <span className={styles.tag}>{s.viaChat}</span>
                      ) : null}
                    </p>
                    <h3>{symptom.name}</h3>
                    {symptom.severity != null ? (
                      <p>{fill(s.symptomSeverity, { value: symptom.severity })}</p>
                    ) : null}
                    {symptom.details ? <p>{symptom.details}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{s.noSymptoms}</p>
            )}
          </section>
        </>
      )}

      <MedicalDisclaimer />
    </main>
  );
}
