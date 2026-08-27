import { LAB_CONFIG } from "./lab-config";

export interface LabView {
  cancelButton: HTMLButtonElement;
  clearLogButton: HTMLButtonElement;
  conditionState: HTMLElement;
  countBadge: HTMLElement;
  currentStep: HTMLElement;
  direction: HTMLElement;
  eventField: HTMLInputElement;
  focusInput: HTMLInputElement;
  frameworkLabel: HTMLElement;
  logEmpty: HTMLElement;
  logList: HTMLOListElement;
  liveRegion: HTMLElement;
  navigation: HTMLElement;
  rendererRoot: HTMLElement;
  revealButton: HTMLButtonElement;
  revealedHost: HTMLElement;
  startButton: HTMLButtonElement;
  statusBadge: HTMLElement;
  customEventButton: HTMLButtonElement;
}

export function createLabView(root: HTMLElement, framework: string): LabView {
  const { copy, event, selectors } = LAB_CONFIG;
  root.innerHTML = `
    <main class="lab-shell">
      <header class="lab-header">
        <div>
          <a class="lab-back-link" href="/">← Playgrounds</a>
          <div class="lab-eyebrow" data-lab-framework></div>
          <h1>${copy.heading}</h1>
          <p>${copy.description}</p>
        </div>
        <div class="lab-header-actions">
          <span class="lab-status-badge" data-lab-status>idle</span>
          <button class="lab-secondary-button" type="button" data-lab-clear>
            Nettoyer le journal
          </button>
          <button class="lab-secondary-button" type="button" data-lab-cancel disabled>
            Annuler
          </button>
          <button class="lab-primary-button" type="button" data-lab-start>
            Démarrer / relancer
          </button>
        </div>
      </header>

      <div class="lab-workspace">
        <section class="lab-targets-section" aria-labelledby="api-lab-targets-title">
          <div class="lab-section-heading">
            <div>
              <span class="lab-panel-kicker">Interactive surface</span>
              <h2 id="api-lab-targets-title">${copy.targetsHeading}</h2>
            </div>
            <span>${copy.targetsSummary}</span>
          </div>

          <div class="lab-target-grid">
            ${targetCard(selectorId(selectors.start), "01", "create / step")}
            <article class="lab-target-card" id="api-lab-focus">
              ${cardNumber("02")}
              <label for="${selectorId(selectors.focusInput)}">focusTarget</label>
              <input id="${selectorId(selectors.focusInput)}" placeholder="Le builder me focus" />
            </article>
            <article class="lab-target-card">
              ${cardNumber("03")}
              <span>clickTarget / waitUntilElement</span>
              <button id="${selectorId(selectors.revealButton)}" type="button">Révéler la cible</button>
              <div data-lab-revealed-host></div>
            </article>
            ${targetCard(selectorId(selectors.condition), "05", "waitUntil", '<strong class="lab-card-state" data-lab-condition>En attente</strong>')}
            ${targetCard(selectorId(selectors.actions), "06", "action true / false")}
            <article class="lab-target-card">
              ${cardNumber("07")}
              <label for="${selectorId(selectors.eventField)}">onTargetEvent([...])</label>
              <input id="${selectorId(selectors.eventField)}" placeholder="Survolez ou saisissez" />
            </article>
            <article class="lab-target-card">
              ${cardNumber("08")}
              <span>onTargetEvent('click')</span>
              <button id="${selectorId(selectors.clickAdvance)}" type="button">Cliquer pour avancer</button>
            </article>
            ${targetCard(selectorId(selectors.return), "09", "advance guard")}
            ${targetCard(selectorId(selectors.previous), "10", "previous")}
            ${targetCard(selectorId(selectors.autoAdvance), "11", "auto advance")}
            <article class="lab-target-card lab-final-card">
              ${cardNumber("12")}
              <span>append / custom event / finish</span>
              <button id="${selectorId(selectors.customEvent)}" type="button">Envoyer ${event.completion}</button>
            </article>
          </div>
        </section>

        <aside class="lab-sidebar">
          <section class="lab-panel" aria-labelledby="api-lab-state-title">
            <div class="lab-panel-heading">
              <div>
                <span class="lab-panel-kicker">Observable state</span>
                <h2 id="api-lab-state-title">État du tour</h2>
              </div>
            </div>
            <dl class="lab-inspector-list">
              <div><dt>Statut</dt><dd data-lab-inspector-status>idle</dd></div>
              <div><dt>Étape</dt><dd data-lab-current-step>0 / 0</dd></div>
              <div><dt>Direction</dt><dd data-lab-direction>advance</dd></div>
              <div><dt>Navigation</dt><dd data-lab-navigation>· · ·</dd></div>
            </dl>
          </section>

          <section class="lab-panel" aria-labelledby="api-lab-log-title">
            <div class="lab-panel-heading">
              <div>
                <span class="lab-panel-kicker">Runtime</span>
                <h2 id="api-lab-log-title">Journal des API</h2>
              </div>
              <span class="lab-count-badge" data-lab-log-count>0</span>
            </div>
            <p class="lab-empty-log" data-lab-log-empty>
              Démarrez le lab pour observer les callbacks et actions.
            </p>
            <ol class="lab-log-list" data-lab-log-list></ol>
            <div class="lab-sr-only" data-lab-live role="status"></div>
          </section>
        </aside>
      </div>
    </main>
    <div data-lab-renderer></div>
  `;

  const view: LabView = {
    cancelButton: required(root, "[data-lab-cancel]", HTMLButtonElement),
    clearLogButton: required(root, "[data-lab-clear]", HTMLButtonElement),
    conditionState: required(root, "[data-lab-condition]", HTMLElement),
    countBadge: required(root, "[data-lab-log-count]", HTMLElement),
    currentStep: required(root, "[data-lab-current-step]", HTMLElement),
    customEventButton: required(root, selectors.customEvent, HTMLButtonElement),
    direction: required(root, "[data-lab-direction]", HTMLElement),
    eventField: required(root, selectors.eventField, HTMLInputElement),
    focusInput: required(root, selectors.focusInput, HTMLInputElement),
    frameworkLabel: required(root, "[data-lab-framework]", HTMLElement),
    logEmpty: required(root, "[data-lab-log-empty]", HTMLElement),
    logList: required(root, "[data-lab-log-list]", HTMLOListElement),
    liveRegion: required(root, "[data-lab-live]", HTMLElement),
    navigation: required(root, "[data-lab-navigation]", HTMLElement),
    rendererRoot: required(root, "[data-lab-renderer]", HTMLElement),
    revealButton: required(root, selectors.revealButton, HTMLButtonElement),
    revealedHost: required(root, "[data-lab-revealed-host]", HTMLElement),
    startButton: required(root, "[data-lab-start]", HTMLButtonElement),
    statusBadge: required(root, "[data-lab-status]", HTMLElement),
  };
  view.frameworkLabel.textContent = `${framework} playground`;
  return view;
}

function cardNumber(number: string): string {
  return `<span class="lab-card-number">${number}</span>`;
}

function targetCard(id: string, number: string, label: string, state = ""): string {
  return `<article class="lab-target-card" id="${id}">${cardNumber(number)}<span>${label}</span>${state}</article>`;
}

function selectorId(selector: string): string {
  if (!selector.startsWith("#") || selector.length === 1) {
    throw new Error(`Lab view requires an id selector: ${selector}`);
  }
  return selector.slice(1);
}

type ElementConstructor<TElement extends Element> = new (...args: never[]) => TElement;

function required<TElement extends Element>(
  root: ParentNode,
  selector: string,
  elementType: ElementConstructor<TElement>,
): TElement {
  const element = root.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing lab element: ${selector}`);
  return element;
}
