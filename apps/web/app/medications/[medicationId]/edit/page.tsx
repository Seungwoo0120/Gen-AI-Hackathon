import { notFound } from "next/navigation";
import { MedicationForm } from "@/components/medications/MedicationForm";
import type { Medication } from "@/lib/api/types";
import { api } from "@/lib/api/client";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";
import { updateMedicationAction } from "../../actions";

type Props = {
  params: Promise<{ medicationId: string }>;
};

export default async function EditMedicationPage({ params }: Props) {
  const { medicationId } = await params;
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
          <a className="button-link" href={`/medications/${medicationId}/edit`}>{t.medications.retry}</a>
        </section>
      </main>
    );
  }
  const medication = medications?.find((item) => item.id === medicationId);
  if (!medication) {
    notFound();
  }

  const action = updateMedicationAction.bind(null, medicationId);

  return (
    <main className="page-content">
      <section className="page-heading">
        <h1>{t.medications.form.editTitle}</h1>
      </section>
      <MedicationForm
        action={action}
        cancelHref="/medications"
        formHref={`/medications/${medicationId}/edit`}
        dayNames={t.medications.dayNames}
        medication={medication}
        messages={t.medications.form}
      />
    </main>
  );
}
