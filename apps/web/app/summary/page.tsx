import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";

export default async function SummaryPage() {
  const language = await getLanguage();
  const t = getMessages(language);

  return <PlaceholderPage comingSoon={t.comingSoon} showDisclaimer title={t.summary.title} />;
}
