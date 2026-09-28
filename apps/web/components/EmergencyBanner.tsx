import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";

export async function EmergencyBanner() {
  const language = await getLanguage();
  const t = getMessages(language);

  return (
    <aside aria-labelledby="emergency-title" className="emergency-banner" role="alert">
      <div>
        <h2 id="emergency-title">{t.emergency.title}</h2>
        <p>{t.emergency.message}</p>
      </div>
      <a className="emergency-banner__call" href="tel:999">
        {t.emergency.call}
      </a>
    </aside>
  );
}
