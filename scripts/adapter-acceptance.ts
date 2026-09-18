import type { GlowTour, StepContext } from "@glowhop/core-tour";
import assert from "node:assert/strict";

export interface AdapterAcceptanceFixture<TContent> {
  readonly name: string;
  readonly primaryRoot: HTMLElement;
  readonly secondaryRoot: HTMLElement;
  readonly primaryTarget: HTMLElement;
  readonly secondaryTarget: HTMLElement;
  readonly primaryTour: GlowTour<TContent>;
  readonly secondaryTour: GlowTour<TContent>;
  content(value: string): TContent;
  mountDuplicatePrimary(): Promise<void>;
  mutate?(update: () => void): Promise<void>;
  settle(): Promise<void>;
  unmount(): Promise<void>;
}

export interface DefaultTourAcceptanceFixture<TContent> {
  readonly idPrefix: string;
  readonly name: string;
  readonly root: HTMLElement;
  readonly target: HTMLElement;
  readonly tour: Pick<GlowTour<TContent>, "create" | "start" | "state">;
  content(value: string): TContent;
  settle(): Promise<void>;
  unmount(): Promise<void>;
}

function popover(root: HTMLElement) {
  const element = root.querySelector<HTMLElement>("[data-glow-tour-popover]");
  assert.ok(element, "acceptance fixture must render a popover inside each root");
  return element;
}

function advanceTrigger(root: HTMLElement) {
  const element = root.querySelector<HTMLElement>("[data-glow-tour-advance-trigger]");
  assert.ok(element, "acceptance fixture must render an advance trigger inside each root");
  return element;
}

function requiredOwnedElement(root: HTMLElement, selector: string, name: string) {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.closest("[data-glow-tour-root]") === root,
  );
  assert.equal(
    elements.length,
    1,
    `${name}: ${selector} must occur exactly once inside the root`,
  );
  const element = elements[0];
  if (!element) throw new Error(`${name}: ${selector} must exist inside the root`);
  return element;
}

function assertContainedBy(child: HTMLElement, parent: HTMLElement, message: string) {
  assert.ok(parent.contains(child), message);
}

function assertDocumentOrder(elements: readonly HTMLElement[], message: string) {
  for (let index = 1; index < elements.length; index += 1) {
    const previous = elements[index - 1];
    const current = elements[index];
    if (!previous || !current) continue;
    assert.ok(
      (previous.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      message,
    );
  }
}

function assertIdFamily(root: HTMLElement, otherRoot: HTMLElement, name: string) {
  const rootPopover = popover(root);
  const otherPopover = popover(otherRoot);
  const title = root.querySelector<HTMLElement>("[data-glow-tour-header]");
  const description = root.querySelector<HTMLElement>("[data-glow-tour-content]");
  const advance = advanceTrigger(root);
  assert.ok(title, `${name}: root must render a title`);
  assert.ok(description, `${name}: root must render a description`);
  assert.notEqual(rootPopover.id, otherPopover.id, `${name}: popover IDs must be isolated`);
  assert.notEqual(
    title.id,
    otherRoot.querySelector<HTMLElement>("[data-glow-tour-header]")?.id,
    `${name}: title IDs must be isolated`,
  );
  assert.notEqual(
    description.id,
    otherRoot.querySelector<HTMLElement>("[data-glow-tour-content]")?.id,
    `${name}: description IDs must be isolated`,
  );
  assert.equal(rootPopover.getAttribute("aria-labelledby"), title.id, `${name}: title relation`);
  assert.equal(
    rootPopover.getAttribute("aria-describedby"),
    description.id,
    `${name}: description relation`,
  );
  assert.equal(advance.getAttribute("aria-controls"), rootPopover.id, `${name}: control relation`);
}

export async function runAdapterAcceptance<TContent>(
  fixture: AdapterAcceptanceFixture<TContent>,
) {
  const {
    content,
    mountDuplicatePrimary,
    mutate,
    name,
    primaryRoot,
    primaryTarget,
    primaryTour,
    secondaryRoot,
    secondaryTarget,
    secondaryTour,
    settle,
    unmount,
  } = fixture;
  const workflow = (
    tour: GlowTour<TContent>,
    target: HTMLElement,
    workflowName: string,
    captureProps?: (props: StepContext<TContent>["props"]) => void,
    allowInteraction = false,
  ) =>
    tour
      .create(workflowName)
      .step({ id: "step-1",
        behavior: allowInteraction ? { allowInteraction: true } : undefined,
        content: content("First content"),
        target,
        title: content("First title"),
      })
      .do(({ props }) => captureProps?.(props))
      .step({ id: "step-2",
        behavior: { allowInteraction: true },
        content: content("Second content"),
        target,
        title: content("Second title"),
      })
      .build();

  assert.notEqual(primaryRoot.id, secondaryRoot.id, `${name}: root IDs must be isolated`);
  assertIdFamily(primaryRoot, secondaryRoot, `${name}: primary`);
  assertIdFamily(secondaryRoot, primaryRoot, `${name}: secondary`);
  await assert.rejects(
    mountDuplicatePrimary,
    /already connected|another root|two roots|live root lease/i,
  );

  let primaryProps!: StepContext<TContent>["props"];
  await primaryTour.start(
    workflow(primaryTour, primaryTarget, `${name}-primary`, (props) => {
      primaryProps = props;
    }),
  );
  await assert.rejects(
    () => secondaryTour.start(workflow(secondaryTour, secondaryTarget, `${name}-secondary-modal`)),
    /only supports one active modal tour per document/,
  );
  await secondaryTour.start(
    workflow(secondaryTour, secondaryTarget, `${name}-secondary`, undefined, true),
  );
  await settle();

  assert.equal(primaryTour.state.get().status, "active", `${name}: primary active`);
  assert.equal(secondaryTour.state.get().status, "active", `${name}: secondary active`);
  assert.equal(popover(primaryRoot).getAttribute("aria-modal"), "true", `${name}: modal step`);

  const updatePrimaryProps = () =>
    primaryProps.set((props) => ({
      ...props,
      content: content("Updated content"),
      title: content("Updated title"),
    }));
  if (mutate) await mutate(updatePrimaryProps);
  else updatePrimaryProps();
  await settle();
  assert.match(primaryRoot.textContent ?? "", /Updated title/, `${name}: dynamic title`);
  assert.match(primaryRoot.textContent ?? "", /Updated content/, `${name}: dynamic content`);

  advanceTrigger(primaryRoot).dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await settle();
  assert.equal(primaryTour.state.get().currentStepIndex, 1, `${name}: primary advanced`);
  assert.equal(secondaryTour.state.get().currentStepIndex, 0, `${name}: secondary isolated`);
  assert.equal(popover(primaryRoot).hasAttribute("aria-modal"), false, `${name}: nonmodal step`);

  await primaryTour.advance();
  assert.equal(primaryTour.state.get().status, "finished", `${name}: primary finished`);

  await unmount();
  await assert.rejects(
    () => primaryTour.start(primaryTour.create(`${name}-released`).build()),
    /connected root/i,
  );
  await assert.rejects(
    () => secondaryTour.start(secondaryTour.create(`${name}-secondary-released`).build()),
    /connected root/i,
  );
}

export async function runDefaultTourAcceptance<TContent>(
  fixture: DefaultTourAcceptanceFixture<TContent>,
) {
  const { content, idPrefix, name, root, target, tour, unmount } = fixture;
  /**
   * Waits for the tour to finish entering a step, not just for the next tick.
   * Entering a step scrolls to its target and only hands the popover over once
   * the page has stopped moving, which takes a few animation frames.
   */
  const settle = async () => {
    await fixture.settle();
    for (let tick = 0; tick < 40 && tour.state.get().status === "transitioning"; tick += 1) {
      await fixture.settle();
    }
  };
  const workflow = () =>
    tour
      .create(`${name} workflow`)
      .step({ id: "step-3", content: content("First content"), target, title: content("First title") })
      .step({ id: "step-4", content: content("Second content"), target, title: content("Second title") })
      .build();

  await tour.start(workflow());
  await settle();

  assert.equal(root.matches("[data-glow-tour-root]"), true, `${name}: root selector`);
  assert.equal(root.id, `${idPrefix}-root`, `${name}: root ID prefix`);
  assert.equal(
    root.querySelectorAll("[data-glow-tour-root]").length,
    0,
    `${name}: root must not contain nested roots`,
  );
  const overlay = requiredOwnedElement(root, "[data-glow-tour-overlay]", name);
  const pointer = requiredOwnedElement(root, "[data-glow-tour-pointer]", name);
  const popover = requiredOwnedElement(root, "[data-glow-tour-popover]", name);
  const header = requiredOwnedElement(root, "[data-glow-tour-header]", name);
  const description = requiredOwnedElement(root, "[data-glow-tour-content]", name);
  const footer = requiredOwnedElement(root, "[data-glow-tour-footer]", name);
  const cancel = requiredOwnedElement(root, "[data-glow-tour-cancel-trigger]", name);
  const previous = requiredOwnedElement(root, "[data-glow-tour-previous-trigger]", name);
  const advance = requiredOwnedElement(root, "[data-glow-tour-advance-trigger]", name);

  for (const element of [overlay, pointer, popover]) {
    assertContainedBy(element, root, `${name}: presentation must belong to the root`);
  }
  assertDocumentOrder([overlay, pointer, popover], `${name}: root presentation order`);
  for (const element of [header, description, footer]) {
    assertContainedBy(element, popover, `${name}: popover content must belong to the popover`);
  }
  assertDocumentOrder([header, description, footer], `${name}: popover content order`);
  for (const trigger of [cancel, previous, advance]) {
    assertContainedBy(trigger, footer, `${name}: footer control must belong to the footer`);
  }
  assertDocumentOrder([cancel, previous, advance], `${name}: footer control order`);
  assert.equal(popover.getAttribute("aria-labelledby"), header.id, `${name}: title relation`);
  assert.equal(
    popover.getAttribute("aria-describedby"),
    description.id,
    `${name}: description relation`,
  );
  for (const trigger of [cancel, previous, advance]) {
    assert.equal(trigger.getAttribute("aria-controls"), popover.id, `${name}: control relation`);
  }
  assert.match(root.textContent ?? "", /First title/, `${name}: first title renders`);
  assert.match(root.textContent ?? "", /First content/, `${name}: first content renders`);

  advance.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  await settle();
  assert.equal(tour.state.get().currentStepIndex, 1, `${name}: advance navigates`);
  assert.match(root.textContent ?? "", /Second title/, `${name}: second title renders`);
  assert.match(root.textContent ?? "", /Second content/, `${name}: second content renders`);

  previous.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  await settle();
  assert.equal(tour.state.get().currentStepIndex, 0, `${name}: previous navigates`);

  advance.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  await settle();
  advance.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  await settle();
  assert.equal(tour.state.get().status, "finished", `${name}: advance finishes`);

  // beforeEnter runs before the step is shown, so the adapter never renders the declared props.
  // The hook waits before setting props: a step shown too early would render in the meantime.
  const renderedTexts: string[] = [];
  const observer = new MutationObserver(() => renderedTexts.push(root.textContent ?? ""));
  observer.observe(root, { characterData: true, childList: true, subtree: true });
  await tour.start(
    tour
      .create(`${name} beforeEnter`)
      .step({
        id: "step-5",
        content: content("Declared content"),
        target,
        title: content("Declared title"),
      })
      .beforeEnter(async ({ props }) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        props.set((current) => ({
          ...current,
          content: content("Entered content"),
          title: content("Entered title"),
        }));
      })
      .build(),
  );
  await settle();
  renderedTexts.push(root.textContent ?? "");
  observer.disconnect();
  assert.match(root.textContent ?? "", /Entered title/, `${name}: beforeEnter title renders`);
  assert.match(root.textContent ?? "", /Entered content/, `${name}: beforeEnter content renders`);
  assert.equal(
    renderedTexts.some((text) => /Declared (title|content)/.test(text)),
    false,
    `${name}: props set in beforeEnter render first`,
  );

  // The default tour keeps its footer and every trigger when every control is disabled; an adapter
  // may drop an element or hide an ancestor.
  const shown = (selector: string) => {
    const element = root.querySelector(selector);
    return element !== null && element.closest("[hidden]") === null;
  };
  const disabled = (selector: string) =>
    root.querySelector<HTMLButtonElement>(selector)?.disabled === true;
  await tour.start(
    tour
      .create(`${name} disabled controls`)
      .step({
        id: "step-6",
        content: content("Disabled controls content"),
        controls: {
          advance: { state: "disabled" },
          cancel: { state: "disabled" },
          previous: { state: "disabled" },
        },
        target,
        title: content("Disabled controls title"),
      })
      .build(),
  );
  await settle();
  assert.match(root.textContent ?? "", /Disabled controls title/, `${name}: disabled controls step renders`);
  assert.equal(shown("[data-glow-tour-footer]"), true, `${name}: footer kept with disabled controls`);
  for (const control of ["advance", "previous", "cancel"] as const) {
    const selector = `[data-glow-tour-${control}-trigger]`;
    assert.equal(shown(selector), true, `${name}: disabled ${control} still rendered`);
    assert.equal(disabled(selector), true, `${name}: disabled ${control}`);
  }

  // Without a title, the header is omitted and the content names the dialog.
  await tour.start(
    tour
      .create(`${name} untitled`)
      .step({ id: "step-7", content: content("Untitled content"), target })
      .build(),
  );
  await settle();
  assert.match(root.textContent ?? "", /Untitled content/, `${name}: untitled step renders`);
  assert.equal(shown("[data-glow-tour-header]"), false, `${name}: header omitted without a title`);
  assert.equal(
    popover.getAttribute("aria-labelledby"),
    description.id,
    `${name}: content names an untitled dialog`,
  );
  assert.equal(popover.hasAttribute("aria-describedby"), false, `${name}: untitled description`);

  // A step's classNames override the workflow ones per component, and they leave with the step.
  const classTargets = {
    overlay: "[data-glow-tour-overlay]",
    pointer: "[data-glow-tour-pointer]",
    popover: "[data-glow-tour-popover]",
    header: "[data-glow-tour-header]",
    content: "[data-glow-tour-content]",
    footer: "[data-glow-tour-footer]",
    previous: "[data-glow-tour-previous-trigger]",
    advance: "[data-glow-tour-advance-trigger]",
    cancel: "[data-glow-tour-cancel-trigger]",
  } as const;
  const classesOf = (slot: keyof typeof classTargets) =>
    Array.from(requiredOwnedElement(root, classTargets[slot], name).classList).sort();
  let classProps: StepContext<TContent>["props"] | undefined;
  await tour.start(
    tour
      .create(`${name} classNames`, {
        classNames: {
          popover: "tour-popover",
          advance: ["tour-control"],
          header: "tour-header",
          footer: "tour-footer",
        },
      })
      .step({
        id: "step-8",
        content: content("Classes content"),
        target,
        title: content("Classes title"),
        classNames: {
          overlay: "step-overlay",
          pointer: ["step-pointer"],
          popover: ["step-popover"],
          header: "step-header",
          content: "step-content step-content-extra",
          previous: "step-previous",
          advance: "step-advance",
          cancel: "step-cancel",
        },
      })
      .do(({ props }) => {
        classProps = props;
      })
      .step({ id: "step-9", content: content("Plain content"), target, title: content("Plain title") })
      .build(),
  );
  await settle();
  const expectedClasses = {
    overlay: ["step-overlay"],
    pointer: ["step-pointer"],
    popover: ["step-popover"],
    header: ["step-header"],
    content: ["step-content", "step-content-extra"],
    footer: ["tour-footer"],
    previous: ["step-previous"],
    advance: ["step-advance"],
    cancel: ["step-cancel"],
  };
  for (const slot of Object.keys(classTargets) as (keyof typeof classTargets)[]) {
    assert.deepEqual(classesOf(slot), expectedClasses[slot], `${name}: ${slot} step classes`);
  }
  classProps?.update({ classNames: { popover: "updated-popover" } });
  await settle();
  assert.deepEqual(classesOf("popover"), ["updated-popover"], `${name}: updated popover classes`);
  assert.deepEqual(classesOf("header"), ["step-header"], `${name}: other classes kept`);
  requiredOwnedElement(root, "[data-glow-tour-advance-trigger]", name).dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await settle();
  assert.match(root.textContent ?? "", /Plain title/, `${name}: step without classNames renders`);
  assert.deepEqual(classesOf("popover"), ["tour-popover"], `${name}: workflow classes only`);
  assert.deepEqual(classesOf("advance"), ["tour-control"], `${name}: workflow control classes`);
  assert.deepEqual(classesOf("header"), ["tour-header"], `${name}: workflow header classes`);
  assert.deepEqual(classesOf("footer"), ["tour-footer"], `${name}: workflow footer classes`);
  for (const slot of ["overlay", "pointer", "content", "previous", "cancel"] as const) {
    assert.deepEqual(classesOf(slot), [], `${name}: ${slot} step classes removed`);
  }
  requiredOwnedElement(root, "[data-glow-tour-cancel-trigger]", name).dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await settle();
  assert.equal(tour.state.get().status, "cancelled", `${name}: classNames tour cancelled`);

  await tour.start(workflow());
  await settle();
  assert.equal(shown("[data-glow-tour-footer]"), true, `${name}: footer shown with enabled controls`);
  assert.equal(
    popover.getAttribute("aria-labelledby"),
    root.querySelector("[data-glow-tour-header]")?.id,
    `${name}: title names the dialog again`,
  );
  assert.equal(popover.getAttribute("aria-describedby"), description.id, `${name}: description back`);
  requiredOwnedElement(root, "[data-glow-tour-cancel-trigger]", name).dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await settle();
  assert.equal(tour.state.get().status, "cancelled", `${name}: cancel cancels`);

  await unmount();
  await assert.rejects(
    () => tour.start(tour.create(`${name} released`).build()),
    /connected root/i,
  );
}
