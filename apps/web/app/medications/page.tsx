import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";

export default async function MedicationsPage() {
  const language = await getLanguage();
  const t = getMessages(language);

  return <PlaceholderPage comingSoon={t.comingSoon} title={t.medications.title} />;
}
