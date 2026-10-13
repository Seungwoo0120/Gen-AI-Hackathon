import { MedicationForm } from "@/components/medications/MedicationForm";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";
import { createMedicationAction } from "../actions";

export default async function NewMedicationPage() {
  const language = await getLanguage();
  const t = getMessages(language);

  return (
    <main className="page-content">
      <section className="page-heading">
        <h1>{t.medications.form.addTitle}</h1>
      </section>
      <MedicationForm
        action={createMedicationAction}
        cancelHref="/medications"
        formHref="/medications/new"
        dayNames={t.medications.dayNames}
        messages={t.medications.form}
      />
    </main>
  );
}
