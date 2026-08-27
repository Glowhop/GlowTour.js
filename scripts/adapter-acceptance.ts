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

function popover(root: HTMLElement) {
  const element = root.querySelector<HTMLElement>("[data-glow-tour-popover]");
  assert.ok(element, "acceptance fixture must render a popover inside each root");
  return element;
}

function nextTrigger(root: HTMLElement) {
  const element = root.querySelector<HTMLElement>("[data-glow-tour-next-trigger]");
  assert.ok(element, "acceptance fixture must render a next trigger inside each root");
  return element;
}

function assertIdFamily(root: HTMLElement, otherRoot: HTMLElement, name: string) {
  const rootPopover = popover(root);
  const otherPopover = popover(otherRoot);
  const title = root.querySelector<HTMLElement>("[data-glow-tour-header]");
  const description = root.querySelector<HTMLElement>("[data-glow-tour-content]");
  const next = nextTrigger(root);
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
  assert.equal(next.getAttribute("aria-controls"), rootPopover.id, `${name}: control relation`);
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

  nextTrigger(primaryRoot).dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  await settle();
  assert.equal(primaryTour.state.get().currentStepIndex, 1, `${name}: primary advanced`);
  assert.equal(secondaryTour.state.get().currentStepIndex, 0, `${name}: secondary isolated`);
  assert.equal(popover(primaryRoot).hasAttribute("aria-modal"), false, `${name}: nonmodal step`);

  await primaryTour.goNext();
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
