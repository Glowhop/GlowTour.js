import { createGlowTour } from "@glowhop/react-tour";
import * as React from "react";
import styles from "./api-lab.module.css";
import type { ApiLabLogEntry } from "./api-lab.types";
import { createApiLabSession } from "./api-lab-session";
import { createApiLabWorkflow } from "./api-lab-workflow";
import { EventLog } from "./components/event-log";
import { LabHeader } from "./components/lab-header";
import { TargetGrid } from "./components/target-grid";
import { TourInspector } from "./components/tour-inspector";
import { TourRenderer } from "./components/tour-renderer";

export default function ApiLab() {
  const [tour] = React.useState(() => createGlowTour());
  const [session] = React.useState(() => createApiLabSession());
  const [logs, setLogs] = React.useState<ApiLabLogEntry[]>([]);
  const [revealed, setRevealed] = React.useState(false);
  const [conditionReady, setConditionReady] = React.useState(false);
  const conditionReadyRef = React.useRef(false);
  const conditionTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusInputRef = React.useRef<HTMLInputElement>(null);
  const logSequenceRef = React.useRef(0);

  const log = React.useCallback((message: string) => {
    logSequenceRef.current += 1;
    const entry: ApiLabLogEntry = {
      id: logSequenceRef.current,
      message,
      time: new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date()),
    };
    setLogs((current) => [entry, ...current].slice(0, 40));
  }, []);

  const clearConditionTimer = React.useCallback(() => {
    if (conditionTimerRef.current === null) return;
    clearTimeout(conditionTimerRef.current);
    conditionTimerRef.current = null;
  }, []);

  const resetLab = React.useCallback(() => {
    clearConditionTimer();
    session.reset();
    conditionReadyRef.current = false;
    setConditionReady(false);
    setRevealed(false);
    setLogs([]);
  }, [clearConditionTimer, session]);

  const startTour = React.useCallback(() => {
    const focusInput = focusInputRef.current;
    if (!focusInput) {
      log("Erreur — la cible HTMLElement n’est pas montée");
      return;
    }

    resetLab();
    const workflow = createApiLabWorkflow(
      tour,
      { focusInput },
      {
        isConditionReady: () => conditionReadyRef.current,
        log,
        scheduleCondition: () => {
          clearConditionTimer();
          conditionTimerRef.current = setTimeout(() => {
            conditionReadyRef.current = true;
            setConditionReady(true);
            log("Condition applicative — prête");
          }, 650);
        },
      },
      session,
    );

    void tour.run(workflow).catch((error: unknown) => {
      log(`Erreur run() — ${error instanceof Error ? error.message : String(error)}`);
    });
  }, [clearConditionTimer, log, resetLab, session, tour]);

  const cancelTour = React.useCallback(() => {
    void tour.cancel().catch((error: unknown) => {
      log(`Erreur cancel() — ${error instanceof Error ? error.message : String(error)}`);
    });
  }, [log, tour]);

  const dispatchCustomEvent = React.useCallback(() => {
    const target = document.querySelector("#api-lab-custom-event");
    target?.dispatchEvent(
      new CustomEvent("api-lab:complete", {
        bubbles: true,
        detail: { source: "React API Lab" },
      }),
    );
  }, []);

  React.useEffect(
    () => () => {
      clearConditionTimer();
    },
    [clearConditionTimer],
  );

  return (
    <main className={styles.shell}>
      <LabHeader
        onCancel={cancelTour}
        onClearLog={() => setLogs([])}
        onStart={startTour}
        tour={tour}
      />

      <div className={styles.workspace}>
        <TargetGrid
          conditionReady={conditionReady}
          focusInputRef={focusInputRef}
          onDispatchCustomEvent={dispatchCustomEvent}
          onReveal={() => setRevealed(true)}
          revealed={revealed}
        />
        <aside className={styles.sidebar}>
          <TourInspector tour={tour} />
          <EventLog entries={logs} />
        </aside>
      </div>

      <TourRenderer tour={tour} />
    </main>
  );
}
