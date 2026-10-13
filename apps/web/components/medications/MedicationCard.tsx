import type { Medication } from "@/lib/api/types";
import type { Messages } from "@/lib/i18n";
import { formatSchedule } from "@/lib/medications/schedule";
import styles from "./MedicationCard.module.css";

type Props = {
  medication: Medication;
  messages: Messages["medications"];
};

export function MedicationCard({ medication, messages }: Props) {
  const scheduleText = formatSchedule(medication.schedule, {
    everyDay: messages.scheduleEveryDay,
    noTimes: messages.scheduleNoTimes,
    dayNames: messages.dayNames,
  });

  return (
    <li className={styles.card}>
      <h2 className={styles.name}>{medication.name}</h2>
      {medication.dose ? <p className={styles.dose}>{medication.dose}</p> : null}
      <p className={styles.schedule}>{scheduleText}</p>
      {medication.notes ? <p className={styles.notes}>{medication.notes}</p> : null}
      <div className={styles.actions}>
        <a className={styles.actionLink} href={`/medications/${medication.id}/edit`}>
          {messages.edit}
        </a>
        <a className={styles.actionLinkDanger} href={`/medications/${medication.id}/delete`}>
          {messages.delete}
        </a>
      </div>
    </li>
  );
}
