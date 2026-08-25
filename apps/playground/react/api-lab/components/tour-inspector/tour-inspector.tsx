import type { Tour } from "@glowhop/react-tour";
import type { ReactNode } from "react";
import * as React from "react";
import styles from "../../api-lab.module.css";

interface Props {
  tour: Tour<ReactNode>;
}

export function TourInspector({ tour }: Props) {
  const snapshot = React.useSyncExternalStore(tour.state.subscribe, tour.state.get, tour.state.get);

  return (
    <section className={styles.panel} aria-labelledby="api-lab-state-title">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.panelKicker}>Observable state</span>
          <h2 id="api-lab-state-title">État du tour</h2>
        </div>
      </div>
      <dl className={styles.inspectorList}>
        <div>
          <dt>Statut</dt>
          <dd>{snapshot.status}</dd>
        </div>
        <div>
          <dt>Étape</dt>
          <dd>
            {snapshot.currentStepIndex >= 0 ? snapshot.currentStepIndex + 1 : 0} /{" "}
            {snapshot.totalSteps}
          </dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>{snapshot.direction}</dd>
        </div>
        <div>
          <dt>Navigation</dt>
          <dd>
            {snapshot.canPrevious ? "←" : "·"} {snapshot.canAdvance ? "→" : "·"}{" "}
            {snapshot.canCancel ? "×" : "·"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
