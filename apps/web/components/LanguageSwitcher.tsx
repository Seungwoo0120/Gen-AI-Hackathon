import type { Language } from "@/lib/api/types";
import type { Messages } from "@/lib/i18n";
import { setLanguage } from "@/app/actions";

type LanguageMessages = Messages["language"];

export function LanguageSwitcher({
  language,
  messages,
}: {
  language: Language;
  messages: LanguageMessages;
}) {
  return (
    <form action={setLanguage} className="language-switcher">
      <span className="language-switcher__label">{messages.label}</span>
      <div aria-label={messages.label} className="language-switcher__options" role="group">
        <button
          aria-pressed={language === "en"}
          className="language-switcher__button"
          name="lang"
          type="submit"
          value="en"
        >
          {messages.english}
        </button>
        <button
          aria-pressed={language === "zh-Hant"}
          className="language-switcher__button"
          name="lang"
          type="submit"
          value="zh-Hant"
        >
          {messages.traditionalChinese}
        </button>
      </div>
    </form>
  );
}
