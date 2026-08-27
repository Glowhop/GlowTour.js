import type { GlowTour, TourState } from "@glowhop/core-tour";
import { createLabWorkflow } from "./create-lab-workflow";
import { LAB_CONFIG } from "./lab-config";
import { createLabSession } from "./lab-session";
import type { LabContentFactory } from "./lab-types";
import { createLabView, type LabView } from "./lab-view";

export interface LabMount {
  addCleanup(cleanup: () => void): void;
  dispose(): void;
  rendererRoot: HTMLElement;
}

interface MountLabOptions<TContent> {
  content: LabContentFactory<TContent>;
  framework: string;
  root: HTMLElement;
  tour: GlowTour<TContent>;
}

interface LogEntry {
  id: number;
  message: string;
  time: string;
}

export function mountLab<TContent>({
  content,
  framework,
  root,
  tour,
}: MountLabOptions<TContent>): LabMount {
  const view = createLabView(root, framework);
  const session = createLabSession();
  const cleanups: Array<() => void> = [];
  const logs: LogEntry[] = [];
  let conditionReady = false;
  let conditionTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let logSequence = 0;

  const log = (message: string) => {
    logSequence += 1;
    logs.unshift({
      id: logSequence,
      message,
      time: new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date()),
    });
    logs.splice(40);
    renderLogs(view, logs);
    view.liveRegion.textContent = message;
  };

  const clearConditionTimer = () => {
    if (conditionTimer === null) return;
    clearTimeout(conditionTimer);
    conditionTimer = null;
  };

  const resetLab = () => {
    clearConditionTimer();
    session.reset();
    conditionReady = false;
    view.conditionState.textContent = "En attente";
    view.revealedHost.replaceChildren();
    logs.length = 0;
    renderLogs(view, logs);
    view.liveRegion.textContent = "";
  };

  const startTour = () => {
    resetLab();
    const workflow = createLabWorkflow(
      tour,
      { focusInput: view.focusInput },
      {
        cancelPending: clearConditionTimer,
        isConditionReady: () => conditionReady,
        log,
        scheduleCondition: () => {
          clearConditionTimer();
          conditionTimer = setTimeout(() => {
            conditionReady = true;
            view.conditionState.textContent = "Prête";
            log("Condition applicative — prête");
          }, LAB_CONFIG.timing.conditionDelay);
        },
      },
      session,
      content,
    );

    void tour.run(workflow).catch((error: unknown) => {
      log(`Erreur run() — ${error instanceof Error ? error.message : String(error)}`);
    });
  };

  listen(view.startButton, "click", startTour, cleanups);
  listen(
    view.cancelButton,
    "click",
    () => {
      clearConditionTimer();
      void tour.cancel().catch((error: unknown) => {
        log(`Erreur cancel() — ${error instanceof Error ? error.message : String(error)}`);
      });
    },
    cleanups,
  );
  listen(
    view.clearLogButton,
    "click",
    () => {
      logs.length = 0;
      renderLogs(view, logs);
      view.liveRegion.textContent = "";
    },
    cleanups,
  );
  listen(
    view.revealButton,
    "click",
    () => {
      const revealed = document.createElement("strong");
      revealed.className = "lab-revealed-target";
      revealed.id = LAB_CONFIG.selectors.revealed.slice(1);
      revealed.textContent = "Resolver prêt";
      view.revealedHost.replaceChildren(revealed);
    },
    cleanups,
  );
  listen(
    view.customEventButton,
    "click",
    () => {
      view.customEventButton.dispatchEvent(
        new CustomEvent(LAB_CONFIG.event.completion, {
          bubbles: true,
          detail: { source: `${framework} API Lab` },
        }),
      );
    },
    cleanups,
  );

  cleanups.push(
    tour.state.subscribe((state) => {
      renderState(view, state);
      if (state.status === "cancelled" || state.status === "error" || state.status === "finished") {
        clearConditionTimer();
      }
    }),
  );
  renderState(view, tour.state.get());
  renderLogs(view, logs);

  return {
    rendererRoot: view.rendererRoot,
    addCleanup(cleanup) {
      if (disposed) {
        cleanup();
        return;
      }
      cleanups.push(cleanup);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearConditionTimer();
      for (const cleanup of cleanups.splice(0).reverse()) cleanup();
      tour.dispose();
      root.replaceChildren();
    },
  };
}

function listen(
  target: EventTarget,
  type: string,
  listener: EventListener,
  cleanups: Array<() => void>,
): void {
  target.addEventListener(type, listener);
  cleanups.push(() => target.removeEventListener(type, listener));
}

function renderLogs(view: LabView, logs: readonly LogEntry[]): void {
  view.countBadge.textContent = String(logs.length);
  view.logEmpty.hidden = logs.length > 0;
  view.logList.replaceChildren(
    ...logs.map((entry) => {
      const item = document.createElement("li");
      item.dataset.logId = String(entry.id);
      const time = document.createElement("time");
      time.textContent = entry.time;
      const message = document.createElement("span");
      message.textContent = entry.message;
      item.append(time, message);
      return item;
    }),
  );
}

function renderState<TContent>(view: LabView, state: TourState<TContent>): void {
  view.statusBadge.dataset.status = state.status;
  view.statusBadge.textContent = state.status;
  view.cancelButton.disabled = !state.canCancel;
  view.currentStep.textContent = `${state.currentStepIndex >= 0 ? state.currentStepIndex + 1 : 0} / ${state.totalSteps}`;
  view.direction.textContent = state.direction;
  view.navigation.textContent = `${state.canGoPrevious ? "←" : "·"} ${state.canGoNext ? "→" : "·"} ${state.canCancel ? "×" : "·"}`;

  const inspectorStatus = view.statusBadge
    .closest(".lab-shell")
    ?.querySelector("[data-lab-inspector-status]");
  if (inspectorStatus) inspectorStatus.textContent = state.status;
}
