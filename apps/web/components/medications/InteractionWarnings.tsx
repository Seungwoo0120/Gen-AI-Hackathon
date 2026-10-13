import { ReadAloudButton } from "@/components/ReadAloudButton";
import type { InteractionCheckResult, Language } from "@/lib/api/types";
import type { Messages } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/i18n/localized";
import styles from "./InteractionWarnings.module.css";

type Props = {
  result: InteractionCheckResult;
  language: Language;
  messages: Messages["medications"]["interactions"];
  readAloudMessages: Messages["readAloud"];
};

export function InteractionWarnings({ result, language, messages, readAloudMessages }: Props) {
  if (result.warnings.length === 0 && result.unrecognized.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="interaction-warnings-title" className={styles.section}>
      <h2 id="interaction-warnings-title">{messages.title}</h2>

      {result.warnings.map((warning, index) => {
        const summaryText = getLocalizedText(warning.summary, language);
        return (
          <article
            className={`${styles.warning} ${styles[`warning--${warning.severity}`]}`}
            key={`${warning.kind}-${index}`}
          >
            <p className={styles.severity}>{messages.severity[warning.severity]}</p>
            <p className={styles.medications}>{warning.medications.join(" + ")}</p>
            <p className={styles.summary}>{summaryText}</p>
            <ul className={styles.sources}>
              {warning.sources.map((source, sourceIndex) =>
                source.url ? (
                  <li key={sourceIndex}>
                    <a href={source.url} rel="noreferrer" target="_blank">
                      {source.title}
                    </a>
                  </li>
                ) : (
                  <li key={sourceIndex}>{source.title}</li>
                ),
              )}
            </ul>
            <ReadAloudButton language={language} messages={readAloudMessages} text={summaryText} />
          </article>
        );
      })}

      {result.unrecognized.length > 0 ? (
        <p className={styles.unrecognized}>
          {messages.notChecked}: {result.unrecognized.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
