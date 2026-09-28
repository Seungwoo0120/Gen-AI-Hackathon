import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";

export async function MedicalDisclaimer() {
  const language = await getLanguage();
  const t = getMessages(language);

  return <p className="medical-disclaimer">{t.notMedicalAdvice}</p>;
}
