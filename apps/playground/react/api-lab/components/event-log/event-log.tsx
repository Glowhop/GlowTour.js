import styles from "../../api-lab.module.css";
import type { ApiLabLogEntry } from "../../api-lab.types";

interface Props {
  entries: readonly ApiLabLogEntry[];
}

export function EventLog({ entries }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="api-lab-log-title">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.panelKicker}>Runtime</span>
          <h2 id="api-lab-log-title">Journal des API</h2>
        </div>
        <span className={styles.countBadge}>{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className={styles.emptyLog}>Démarrez le lab pour observer les callbacks et actions.</p>
      ) : (
        <ol className={styles.logList} aria-live="polite">
          {entries.map((entry) => (
            <li key={entry.id}>
              <time>{entry.time}</time>
              <span>{entry.message}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
