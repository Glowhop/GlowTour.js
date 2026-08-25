import type { Tour, WorkflowDefinition } from "@glowhop/react-tour";
import type { ReactNode } from "react";
import type { ApiLabSession } from "./api-lab-session";

type ReactTour = Tour<ReactNode>;

export interface ApiLabElements {
  focusInput: HTMLInputElement;
}

export interface ApiLabActions {
  isConditionReady(): boolean;
  log(message: string): void;
  scheduleCondition(): void;
}

export function createApiLabWorkflow(
  tour: ReactTour,
  elements: ApiLabElements,
  actions: ApiLabActions,
  session: ApiLabSession,
): WorkflowDefinition<ReactNode> {
  const appendedWorkflow = tour
    .create("react-api-lab-appended")
    .step({
      target: "#api-lab-custom-event",
      title: apiTitle("append() + onTargetEvent<T>()"),
      content: (
        <p>
          Cette étape vient d’un autre workflow. Déclenchez l’événement personnalisé pour finir.
        </p>
      ),
      hideNextButton: true,
      behavior: { allowInteraction: true },
      data: { api: "append", appended: true },
    })
    .onTargetEvent<CustomEvent<{ source: string }>>("api-lab:complete", (event, context) => {
      actions.log(`onTargetEvent<T> — source: ${event.detail.source}`);
      void context.advance();
    })
    .onBack(() => actions.log("onBack — sortie de la section ajoutée"))
    .onCancel(() => actions.log("onCancel — étape ajoutée"))
    .finish();

  return tour
    .create("react-api-lab", {
      cancellable: true,
      animated: true,
      overlay: {
        animated: true,
        animation: { duration: 260, easing: "ease-out" },
        color: "#151126",
        opacity: 0.68,
        padding: 12,
        radius: 14,
      },
      popover: {
        animated: true,
        animation: { duration: 220, easing: "ease-out" },
        placementTryOrder: ["bottom", "right", "top", "left"],
        arrow: {
          color: "#ffffff",
          size: 12,
          borderWidth: 1,
          borderRadius: 3,
          edgePadding: 18,
        },
        disableAutoFocus: false,
        hideProgressIndicator: false,
        gap: 14,
        buttons: {
          backLabel: "Précédent",
          nextLabel: "Continuer",
          finishLabel: "Terminer le lab",
        },
        keyboardShortcuts: {
          back: ["ArrowLeft"],
          next: ["Enter", "ArrowRight"],
          cancel: ["Escape"],
        },
      },
      indicator: {
        animated: true,
        animation: { duration: 220, easing: "ease-in-out" },
        disabled: false,
        gap: 12,
        placementTryOrder: ["right", "bottom", "left", "top"],
      },
      scroll: { behavior: "smooth", block: "center", inline: "nearest" },
      behavior: { missingTargetStrategy: "error", targetTimeout: 3000 },
      onStart: () => actions.log("create.onStart — workflow démarré"),
      onCancel: () => actions.log("create.onCancel — workflow annulé"),
      onFinish: () => actions.log("create.onFinish — API Lab terminé"),
    })
    .step({
      target: "#api-lab-start",
      title: apiTitle("create() + step()"),
      content: <p>Le workflow démarre avec ses options globales et une cible par sélecteur CSS.</p>,
      hideBackButton: true,
      data: { api: "create", targetType: "selector" },
    })
    .onNext(({ props }) => {
      actions.log(`onNext — ${String(props.get().data?.api)}`);
    })
    .onCancel(() => actions.log("onCancel — étape d’introduction"))
    .step({
      target: elements.focusInput,
      title: apiTitle("focusTarget() + exec()"),
      content: <p>La cible est un HTMLElement transmis directement. Le champ reçoit le focus.</p>,
      overlay: { color: "#241a70", opacity: 0.62, padding: 9, radius: 10 },
      popover: {
        placementTryOrder: ["right", "bottom"],
        disableAutoFocus: true,
        gap: 18,
      },
      indicator: { disabled: false, placementTryOrder: ["left", "bottom"] },
      scroll: { behavior: "smooth", block: "center", inline: "center" },
      behavior: { allowInteraction: true },
      data: { api: "focusTarget", targetType: "element" },
    })
    .focusTarget()
    .exec(({ props, target }) => {
      actions.log("exec — contenu courant mis à jour");
      const current = props.get();
      tour.updateCurrentStep(() => ({
        ...current,
        content: <p>Focus appliqué. Cette phrase a été injectée via context.props.</p>,
      }));
      target.focus();
    })
    .wait(80)
    .focusTarget()
    .onBack(() => actions.log("onBack — retour vers l’introduction"))
    .step({
      target: "#api-lab-reveal-button",
      title: apiTitle("clickTarget() + waitUntilElement()"),
      content: <p>Le builder clique la cible, puis attend que React rende le résultat.</p>,
      behavior: { allowInteraction: true },
      data: { api: "waitUntilElement" },
    })
    .clickTarget()
    .waitUntilElement("#api-lab-revealed", { interval: 20, timeout: 2000 })
    .exec(() => actions.log("waitUntilElement — cible révélée détectée"))
    .step({
      target: async ({ signal }) => {
        if (signal.aborted) return null;
        return document.querySelector<HTMLElement>("#api-lab-revealed");
      },
      title: apiTitle("TargetResolver + wait()"),
      content: (
        <p>Cette cible est résolue par une fonction asynchrone après une pause déclarative.</p>
      ),
      disableAutoScroll: true,
      behavior: { missingTargetStrategy: "wait", targetTimeout: 2000 },
      data: { api: "wait", targetType: "resolver" },
    })
    .wait(450)
    .exec(() => actions.log("wait — pause de 450 ms terminée"))
    .step({
      target: "#api-lab-condition",
      title: apiTitle("waitUntil() + advance()"),
      content: <p>Une condition applicative devient vraie, puis l’étape avance automatiquement.</p>,
      hideFooter: true,
      indicator: { animated: false, gap: 8 },
      data: { api: "waitUntil" },
    })
    .exec(() => {
      actions.log("exec — programmation de la condition");
      actions.scheduleCondition();
    })
    .waitUntil(() => actions.isConditionReady(), { interval: 25, timeout: 2000 })
    .exec(() => actions.log("waitUntil — condition satisfaite"))
    .wait(500)
    .advance()
    .step({
      target: "#api-lab-actions",
      title: apiTitle("action(): true | false"),
      content: (
        <p>La première action continue la chaîne. La seconde l’arrête avant l’action sentinelle.</p>
      ),
      disableBackButton: true,
      disableNextButton: true,
      data: { api: "action", result: false },
    })
    .action(() => {
      tour.updateCurrentStep((current) => ({ ...current, disableNextButton: false }));
      actions.log("action(true) — chaîne poursuivie");
      return true;
    })
    .action(() => {
      actions.log("action(false) — chaîne arrêtée comme prévu");
      return false;
    })
    .exec(() => actions.log("Erreur: cette action sentinelle ne doit pas s’exécuter"))
    .step({
      target: "#api-lab-event-field",
      title: apiTitle("onTargetEvent([...])"),
      content: <p>Survolez le champ ou appuyez sur une touche, puis continuez.</p>,
      behavior: { allowInteraction: true },
      data: { api: "onTargetEvent", overload: "array" },
    })
    .onTargetEvent(["pointerenter", "keydown"], (event) => {
      actions.log(`onTargetEvent([...]) — ${event.type}`);
    })
    .step({
      target: "#api-lab-click-advance",
      title: apiTitle("onTargetEvent('click')"),
      content: <p>Le bouton Suivant est masqué. Cliquez directement sur la cible pour avancer.</p>,
      hideNextButton: true,
      behavior: { allowInteraction: true },
      data: { api: "onTargetEvent", overload: "single" },
    })
    .onTargetEvent("click", (_event, context) => {
      actions.log("onTargetEvent('click') — avance via le contexte");
      void context.advance();
    })
    .step({
      target: "#api-lab-return",
      title: apiTitle("action() + advance()"),
      content: (
        <p>
          Continuez. Cette étape saura vous renvoyer automatiquement après la démonstration
          suivante.
        </p>
      ),
      data: { api: "advance", guard: true },
    })
    .action(() => session.consumeAutomaticReturn())
    .advance()
    .step({
      target: "#api-lab-previous",
      title: apiTitle("previous()"),
      content: (
        <p>Premier passage : retour automatique. Second passage : la garde stoppe la boucle.</p>
      ),
      resetPropsOnEnter: false,
      data: { api: "previous", guarded: true },
    })
    .action(() => {
      if (!session.beginPreviousDemo()) {
        actions.log("action(false) — boucle previous évitée");
        return false;
      }
      session.armAutomaticReturn();
      actions.log("previous — retour automatique dans 650 ms");
      return true;
    })
    .wait(650)
    .previous()
    .onNext(() => actions.log("onNext — sortie de la démonstration previous"))
    .step({
      target: "#api-lab-auto-advance",
      title: apiTitle("wait() + advance()"),
      content: <p>La navigation finale est automatique et le footer est masqué.</p>,
      hideFooter: true,
      data: { api: "advance", automatic: true },
    })
    .exec(() => actions.log("advance — transition automatique imminente"))
    .wait(650)
    .advance()
    .append(appendedWorkflow)
    .finish();
}

function apiTitle(method: string) {
  return (
    <span>
      API Builder <code>{method}</code>
    </span>
  );
}
