import { notFound } from "next/navigation";
import type { Medication } from "@/lib/api/types";
import { api } from "@/lib/api/client";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";
import { deleteMedicationAction } from "../../actions";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ medicationId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function DeleteMedicationPage({ params, searchParams }: Props) {
  const { medicationId } = await params;
  const { error } = await searchParams;
  const language = await getLanguage();
  const t = getMessages(language);

  let medications: Medication[] | undefined;
  try {
    const result = await api.GET("/medications", { cache: "no-store" });
    medications = result.data;
  } catch {
    // The same retry state covers network failures and HTTP error responses.
  }
  if (!medications) {
    return (
      <main className="page-content">
        <section className="status-notice status-notice--error" role="alert">
          <h1>{t.medications.errorTitle}</h1>
          <p>{t.medications.errorMessage}</p>
          <a className="button-link" href={`/medications/${medicationId}/delete`}>{t.medications.retry}</a>
        </section>
      </main>
    );
  }
  const medication = medications?.find((item) => item.id === medicationId);
  if (!medication) {
    notFound();
  }

  const action = deleteMedicationAction.bind(null, medicationId);

  return (
    <main className="page-content">
      <section className="page-heading">
        <h1>{t.medications.deleteConfirm.title}</h1>
        <p>{medication.name}</p>
      </section>
      {error === "1" ? <p className="status-notice status-notice--error" role="alert">{t.medications.errorMessage}</p> : null}
      <p>{t.medications.deleteConfirm.body}</p>
      <form action={action} className={styles.actions}>
        <a className="button-link" href="/medications">
          {t.medications.deleteConfirm.cancel}
        </a>
        <button className={styles.confirmButton} type="submit">
          {t.medications.deleteConfirm.confirm}
        </button>
      </form>
    </main>
  );
}
