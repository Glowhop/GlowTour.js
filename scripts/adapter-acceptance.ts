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

function requiredElement(root: HTMLElement, selector: string, name: string) {
  assert.equal(
    root.querySelectorAll(selector).length,
    1,
    `${name}: ${selector} must occur exactly once inside the root`,
  );
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`${name}: ${selector} must exist inside the root`);
  return element;
}

function directChildMarkers(element: HTMLElement) {
  const markers: string[] = [];
  for (let index = 0; index < element.children.length; index += 1) {
    const child = element.children.item(index);
    if (!child) continue;
    if (child.hasAttribute("data-glow-tour-overlay")) markers.push("overlay");
    else if (child.hasAttribute("data-glow-tour-pointer")) markers.push("pointer");
    else if (child.hasAttribute("data-glow-tour-popover")) markers.push("popover");
    else if (child.hasAttribute("data-glow-tour-header")) markers.push("header");
    else if (child.hasAttribute("data-glow-tour-content")) markers.push("content");
    else if (child.hasAttribute("data-glow-tour-footer")) markers.push("footer");
    else if (child.hasAttribute("data-glow-tour-cancel-trigger")) markers.push("cancel");
    else if (child.hasAttribute("data-glow-tour-previous-trigger")) markers.push("previous");
    else if (child.hasAttribute("data-glow-tour-advance-trigger")) markers.push("advance");
    else markers.push("unknown");
  }
  return markers;
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
  ) =>
    tour
      .create(workflowName)
      .step({ content: content("First content"), target, title: content("First title") })
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
  await secondaryTour.run(workflow(secondaryTour, secondaryTarget, `${name}-secondary`));
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
  const overlay = requiredElement(root, "[data-glow-tour-overlay]", name);
  const pointer = requiredElement(root, "[data-glow-tour-pointer]", name);
  const popover = requiredElement(root, "[data-glow-tour-popover]", name);
  const header = requiredElement(root, "[data-glow-tour-header]", name);
  const description = requiredElement(root, "[data-glow-tour-content]", name);
  const footer = requiredElement(root, "[data-glow-tour-footer]", name);
  const cancel = requiredElement(root, "[data-glow-tour-cancel-trigger]", name);
  const previous = requiredElement(root, "[data-glow-tour-previous-trigger]", name);
  const advance = requiredElement(root, "[data-glow-tour-advance-trigger]", name);

  assert.ok(overlay.parentElement === root, `${name}: overlay must be a root child`);
  assert.ok(pointer.parentElement === root, `${name}: pointer must be a root child`);
  assert.ok(popover.parentElement === root, `${name}: popover must be a root child`);
  assert.deepEqual(
    directChildMarkers(root),
    ["overlay", "pointer", "popover"],
    `${name}: root child order`,
  );
  assert.equal(header.parentElement, popover, `${name}: header must be inside popover`);
  assert.equal(description.parentElement, popover, `${name}: content must be inside popover`);
  assert.equal(footer.parentElement, popover, `${name}: footer must be inside popover`);
  assert.deepEqual(
    directChildMarkers(popover),
    ["header", "content", "footer"],
    `${name}: popover child order`,
  );
  assert.deepEqual(
    directChildMarkers(footer),
    ["cancel", "previous", "advance"],
    `${name}: footer control order`,
  );
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
  requiredElement(root, "[data-glow-tour-cancel-trigger]", name).dispatchEvent(
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
