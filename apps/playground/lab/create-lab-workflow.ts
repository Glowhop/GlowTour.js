import type { GlowTour, WorkflowDefinition } from "@glowhop/core-tour";
import { LAB_CONFIG } from "./lab-config";
import type { LabActions, LabContentFactory, LabElements, LabSession } from "./lab-types";

export function createLabWorkflow<TContent>(
  tour: GlowTour<TContent>,
  elements: LabElements,
  actions: LabActions,
  session: LabSession,
  content: LabContentFactory<TContent>,
): WorkflowDefinition<TContent> {
  const { copy, event, selectors, timing, workflow } = LAB_CONFIG;
  const appendedWorkflow = tour
    .create(workflow.appendedName)
    .step({
      target: selectors.customEvent,
      title: content.title("append() + onTargetEvent<T>()"),
      content: content.paragraph(copy.appended),
      hideAdvanceButton: true,
      behavior: { allowInteraction: true },
      data: { api: "append", appended: true },
    })
    .onTargetEvent<CustomEvent<{ source: string }>>(event.completion, (targetEvent, context) => {
      actions.log(`onTargetEvent<T> — source: ${targetEvent.detail.source}`);
      void context.advance();
    })
    .beforePrevious(() => actions.log("onBack — sortie de la section ajoutée"))
    .beforeCancel(() => actions.log("onCancel — étape ajoutée"))
    .build();

  return tour
    .create(workflow.name, {
      ...workflow.options,
      onStart: () => actions.log("create.onStart — workflow démarré"),
      onCancel: () => actions.log("create.onCancel — workflow annulé"),
      onFinish: () => actions.log("create.onFinish — API Lab terminé"),
    })
    .step({
      target: selectors.start,
      title: content.title("create() + step()"),
      content: content.paragraph(copy.intro),
      hidePreviousButton: true,
      data: { api: "create", targetType: "selector" },
    })
    .beforeAdvance(({ props }) => actions.log(`onAdvance — ${String(props.get().data?.api)}`))
    .beforeCancel(() => actions.log("onCancel — étape d’introduction"))
    .step({
      target: elements.focusInput,
      title: content.title("focusTarget() + exec()"),
      content: content.paragraph(copy.focus),
      overlay: { color: "#241a70", opacity: 0.62, padding: 9, radius: 10 },
      popover: { placementTryOrder: ["right", "bottom"], disableAutoFocus: true, gap: 18 },
      indicator: { disabled: false, placementTryOrder: ["left", "bottom"] },
      scroll: { behavior: "smooth", block: "center", inline: "center" },
      behavior: { allowInteraction: true },
      data: { api: "focusTarget", targetType: "element" },
      resetPropsOnEnter: false,
    })
    .focusTarget()
    .onTargetEvent("input", (ev, context) => {
      const value = ev.target instanceof HTMLInputElement ? ev.target.value : "";
      context.props.set((current) => ({
        ...current,
        data: { ...current.data, event: ev.type },
        content: content.paragraph(value),
      }));
    })
    .wait(timing.focusWait)
    .focusTarget()
    .beforePrevious(() => actions.log("onBack — retour vers l’introduction"))
    .step({
      target: selectors.revealButton,
      title: content.title("clickTarget() + waitUntilElement()"),
      content: content.paragraph(copy.reveal),

      data: { api: "waitUntilElement" },
    })
    .clickTarget()
    .waitUntilElement(selectors.revealed, {
      interval: timing.elementPollingInterval,
      timeout: timing.targetTimeout,
    })
    .do(() => actions.log("waitUntilElement — cible révélée détectée"))
    .step({
      target: async ({ signal }) => {
        if (signal.aborted) return null;
        return document.querySelector<HTMLElement>(selectors.revealed);
      },
      title: content.title("TargetResolver + wait()"),
      content: content.paragraph(copy.resolver),
      disableAutoScroll: true,
      behavior: { missingTargetStrategy: "wait", targetTimeout: timing.targetTimeout },
      data: { api: "wait", targetType: "resolver" },
    })
    .wait(timing.resolverWait)
    .do(() => actions.log(`wait — pause de ${timing.resolverWait} ms terminée`))
    .step({
      target: selectors.condition,
      title: content.title("waitUntil() + advance()"),
      content: content.paragraph(copy.condition),
      hideFooter: true,
      indicator: { animated: false, gap: 8 },
      data: { api: "waitUntil" },
    })
    .do(() => {
      actions.log("exec — programmation de la condition");
      actions.scheduleCondition();
    })
    .waitUntil(() => actions.isConditionReady(), {
      interval: timing.pollingInterval,
      timeout: timing.targetTimeout,
    })
    .do(() => actions.log("waitUntil — condition satisfaite"))
    .wait(timing.conditionAdvanceWait)
    .do(({ advance }) => advance())
    .beforeCancel(() => actions.cancelPending())
    .step({
      target: selectors.actions,
      title: content.title("action(): true | false"),
      content: content.paragraph(copy.actions),
      disablePreviousButton: true,
      disableAdvanceButton: true,
      data: { api: "action", result: false },
    })
    .do(({ props }) => {
      props.set((current) => ({ ...current, disableAdvanceButton: false }));
      actions.log("action(true) — chaîne poursuivie");
      return true;
    })
    .do(() => {
      actions.log("action(false) — chaîne arrêtée comme prévu");
      return false;
    })
    .do(() => actions.log("Erreur: cette action sentinelle ne doit pas s’exécuter"))
    .step({
      target: selectors.eventField,
      title: content.title("onTargetEvent([...])"),
      content: content.paragraph(copy.eventField),
      behavior: { allowInteraction: true },
      data: { api: "onTargetEvent", overload: "array" },
    })
    .onTargetEvent(["pointerenter", "keydown"], (targetEvent) => {
      actions.log(`onTargetEvent([...]) — ${targetEvent.type}`);
    })
    .step({
      target: selectors.clickAdvance,
      title: content.title("onTargetEvent('click')"),
      content: content.paragraph(copy.clickAdvance),
      hideAdvanceButton: true,
      behavior: { allowInteraction: true },
      data: { api: "onTargetEvent", overload: "single" },
    })
    .onTargetEvent("click", (_targetEvent, context) => {
      actions.log("onTargetEvent('click') — avance via le contexte");
      void context.advance();
    })
    .step({
      target: selectors.return,
      title: content.title("action() + advance()"),
      content: content.paragraph(copy.automaticReturn),
      data: { api: "advance", guard: true },
    })
    .do(() => session.consumeAutomaticReturn())
    .do(({ advance }) => advance())
    .step({
      target: selectors.previous,
      title: content.title("previous()"),
      content: content.paragraph(copy.previous),
      resetPropsOnEnter: false,
      data: { api: "previous", guarded: true },
    })
    .do(() => {
      if (!session.beginPreviousDemo()) {
        actions.log("action(false) — boucle previous évitée");
        return false;
      }
      session.armAutomaticReturn();
      actions.log(`previous — retour automatique dans ${timing.previousWait} ms`);
      return true;
    })
    .wait(timing.previousWait)
    .do(({ previous }) => previous())
    .beforeAdvance(() => actions.log("onAdvance — sortie de la démonstration previous"))
    .step({
      target: selectors.autoAdvance,
      title: content.title("wait() + advance()"),
      content: content.paragraph(copy.autoAdvance),
      hideFooter: true,
      data: { api: "advance", automatic: true },
    })
    .do(() => actions.log("advance — transition automatique imminente"))
    .wait(timing.autoAdvanceWait)
    .do(({ advance }) => advance())
    .append(appendedWorkflow)
    .build();
}
