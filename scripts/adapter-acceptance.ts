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
  readonly tour: Pick<GlowTour<TContent>, "create" | "run" | "state">;
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
      .step({
        behavior: allowInteraction ? { allowInteraction: true } : undefined,
        content: content("First content"),
        target,
        title: content("First title"),
      })
      .do(({ props }) => captureProps?.(props))
      .step({
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
  await primaryTour.run(
    workflow(primaryTour, primaryTarget, `${name}-primary`, (props) => {
      primaryProps = props;
    }),
  );
  await assert.rejects(
    () => secondaryTour.run(workflow(secondaryTour, secondaryTarget, `${name}-secondary-modal`)),
    /only supports one active modal tour per document/,
  );
  await secondaryTour.run(
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
    () => primaryTour.run(primaryTour.create(`${name}-released`).build()),
    /connected root/i,
  );
  await assert.rejects(
    () => secondaryTour.run(secondaryTour.create(`${name}-secondary-released`).build()),
    /connected root/i,
  );
}

export async function runDefaultTourAcceptance<TContent>(
  fixture: DefaultTourAcceptanceFixture<TContent>,
) {
  const { content, idPrefix, name, root, settle, target, tour, unmount } = fixture;
  const workflow = () =>
    tour
      .create(`${name} workflow`)
      .step({ content: content("First content"), target, title: content("First title") })
      .step({ content: content("Second content"), target, title: content("Second title") })
      .build();

  await tour.run(workflow());
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

  await tour.run(workflow());
  await settle();
  requiredOwnedElement(root, "[data-glow-tour-cancel-trigger]", name).dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await settle();
  assert.equal(tour.state.get().status, "cancelled", `${name}: cancel cancels`);

  await unmount();
  await assert.rejects(
    () => tour.run(tour.create(`${name} released`).build()),
    /connected root/i,
  );
}
