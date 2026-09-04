// Static source snippets shown next to the hero demos. Kept in sync by hand with
// src/components/HeroDemos.tsx — these are display copies, not imports, so the code shown to
// visitors reads as a clean, standalone example rather than the wired-up demo internals.

export const singleStepSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#workspace-name",
    title: "Start with the workspace name",
    content: "A step can target any element — this one points at a plain field.",
  })
  .step({
    target: "#timezone",
    title: "Then the timezone",
    content: "Chain as many .step() calls as the tour needs.",
  })
  .step({
    target: "#save-button",
    title: "One step, zero setup",
    content: "Point at an element, describe it, and build.",
  })
  .build();

tour.run(workflow);`;

export const multiStepSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#search",
    title: "A normal element works too",
    content: "The tour can point at any element — no special markup needed.",
  })
  .step({
    target: "#filters",
    title: "Placement tries top first",
    content: "This step's popover.placementTryOrder starts with top.",
    popover: { placementTryOrder: ["top", "bottom"] },
  })
  .step({
    target: "#export",
    title: "Then falls back automatically",
    content: "If there's no room, Glow Tour walks the list until one fits.",
    popover: { placementTryOrder: ["right", "left", "bottom"] },
  })
  .build();

tour.run(workflow);`;

export const interactionAllowedSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#avatar",
    title: "Riley Martin's post",
    content: "This tour walks through a single post in the feed.",
  })
  .step({
    target: "#counter",
    title: "The target stays clickable",
    content: "behavior.allowInteraction lets pointer events pass through the overlay.",
    behavior: { allowInteraction: true },
  })
  .build();

tour.run(workflow);`;

export const advanceOnClickSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#progress",
    title: "Step 2 of a 3-step wizard",
    content: "This wizard tracks its own progress — the tour just points it out.",
  })
  .step({
    target: "#continue",
    title: "Click the target to advance",
    content: "onTargetEvent('click', ...) calls context.advance().",
    popover: { hideAdvanceButton: true },
    behavior: { allowInteraction: true },
  })
  .onTargetEvent("click", (event, context) => context.advance())
  .step({
    target: "#continue",
    title: "That advanced the tour",
    content: "No popover button was involved.",
  })
  .build();

tour.run(workflow);`;

export const cancellableSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome", {
    cancellable: false,
  })
  .step({
    target: "#warning",
    title: "Read this carefully",
    content: "A warning is a good place for a tour step too.",
  })
  .step({
    target: "#delete-account",
    title: "This step can't be skipped",
    content: "cancellable: false disables Escape and the Cancel button for the whole tour.",
  })
  .build();

tour.run(workflow);`;

export const customStylingSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#first-member",
    title: "This step looks normal",
    content: "Default overlay and popover styling — no overrides here.",
  })
  .step({
    target: "#invite",
    title: "Same tour, different skin",
    content: "overlay and popover options are real per-workflow overrides.",
    overlay: { color: "#0ea5e9", opacity: 0.35 },
    popover: { arrow: { disabled: true }, hideFooter: true },
  })
  .build();

tour.run(workflow);`;

export const waitForAsyncSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#load-data",
    title: "Load the data first",
    content: "The next step waits for an element that doesn't exist yet.",
    behavior: { allowInteraction: true },
  })
  .step({
    target: "#loaded-content",
    title: "The tour waited for this",
    content: "waitUntilElement(selector) held the tour until this element appeared.",
  })
  .waitUntilElement("#loaded-content")
  .step({
    target: "#activity-row-1",
    title: "Real content, not a skeleton",
    content: "By now the list has actually loaded — this row is the real thing.",
  })
  .build();

tour.run(workflow);`;

export const programmaticSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome", {
    onStart: () => console.log("started"),
    onFinish: () => console.log("finished"),
  })
  .step({
    target: "#doc-title",
    title: "This doc has a title",
    content: "A quick step on the title before we get to the code.",
  })
  .step({
    target: "#publish",
    title: "Steps can run code",
    content: "This step waits, then runs a callback before it's ready.",
  })
  .wait(300)
  .do(() => console.log("do() ran after the wait"))
  .build();

tour.run(workflow);`;

export const customIndicatorSource = `import { Root, Overlay, Pointer, Popover, Header, Content, Footer, AdvanceTrigger, BackTrigger, CancelTrigger } from "@glowhop/react-tour";

const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#upgrade-plan",
    title: "A custom indicator",
    content: "Pointer takes its own children instead of the default glyph.",
    behavior: { allowInteraction: true },
  })
  .build();

// Instead of <DefaultTour tour={tour} />, compose the pieces directly:
<Root tour={tour}>
  <Overlay />
  <Pointer>⭐</Pointer>
  <Popover>
    <Header />
    <Content />
    <Footer>
      <CancelTrigger />
      <BackTrigger />
      <AdvanceTrigger />
    </Footer>
  </Popover>
</Root>;

tour.run(workflow);`;
