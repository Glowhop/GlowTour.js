import type { Tour } from "@glowhop/react-tour";
import type { ReactNode } from "react";
import * as React from "react";
import styles from "../../api-lab.module.css";

interface Props {
  onCancel(): void;
  onClearLog(): void;
  onStart(): void;
  tour: Tour<ReactNode>;
}

export function LabHeader({ onCancel, onClearLog, onStart, tour }: Props) {
  const snapshot = React.useSyncExternalStore(tour.state.subscribe, tour.state.get, tour.state.get);

  return (
    <header className={styles.header}>
      <div>
        <a className={styles.backLink} href="/">
          ← Playgrounds
        </a>
        <div className={styles.eyebrow}>React playground</div>
        <h1>Builder API Lab</h1>
        <p>Un parcours exécutable couvrant chaque API du builder Glow Tour.</p>
      </div>
      <div className={styles.headerActions}>
        <span className={styles.statusBadge} data-status={snapshot.status}>
          {snapshot.status}
        </span>
        <button className={styles.secondaryButton} type="button" onClick={onClearLog}>
          Nettoyer le journal
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          disabled={!snapshot.canCancel}
          onClick={onCancel}
        >
          Annuler
        </button>
        <button className={styles.primaryButton} type="button" onClick={onStart}>
          Démarrer / relancer
        </button>
      </div>
    </header>
  );
}
