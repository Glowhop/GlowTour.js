// Static source snippets shown next to the hero demos. Kept in sync by hand with
// src/components/HeroDemos.tsx — these are display copies, not imports, so the code shown to
// visitors reads as a clean, standalone example rather than the wired-up demo internals.

export const nonInteractiveSource = `const tour = createGlowTour();

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
    title: "A plain, non-interactive walkthrough",
    content: "No special options here — no allowInteraction, no custom behavior.",
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

export const placementOrderSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#widget-a",
    title: "Forcing placement: top",
    content: "popover.placementTryOrder: ['top'] pins this popover above its target.",
    popover: { placementTryOrder: ["top"] },
  })
  .step({
    target: "#widget-b",
    title: "Forcing placement: bottom",
    content: "popover.placementTryOrder: ['bottom'] pins this popover below its target.",
    popover: { placementTryOrder: ["bottom"] },
  })
  .step({
    target: "#widget-c",
    title: "Forcing placement: left",
    content: "popover.placementTryOrder: ['left'] pins this popover to the left of its target.",
    popover: { placementTryOrder: ["left"] },
  })
  .step({
    target: "#widget-d",
    title: "Forcing placement: right",
    content: "popover.placementTryOrder: ['right'] pins this popover to the right of its target.",
    popover: { placementTryOrder: ["right"] },
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

export const confirmCancelSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome", {
    cancellable: true,
    onCancel: (context) => {
      if (!window.confirm("Cancel this tour?")) {
        // Prevents the cancellation — the tour stays open on its current step.
        context.abort();
      }
    },
  })
  .step({
    target: "#project-name",
    title: "Name your project",
    content: "Try pressing Escape, or clicking Cancel below, at any point in this tour.",
  })
  .step({
    target: "#create-project",
    title: "Confirm before you leave",
    content: "Cancelling now opens a real confirm() dialog before the tour actually closes.",
  })
  .build();

tour.run(workflow);`;

export const overlayClickSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#email-notifications",
    title: "Click the overlay to advance",
    content: "behavior.overlayClick: 'advance' — clicking the dimmed backdrop moves forward.",
    behavior: { overlayClick: "advance" },
  })
  .step({
    target: "#push-notifications",
    title: "Now it cancels instead",
    content: "behavior.overlayClick: 'cancel' — clicking the backdrop now cancels the tour.",
    behavior: { overlayClick: "cancel" },
  })
  .build();

tour.run(workflow);`;

export const customStyledIndicatorSource = `import { Root, Overlay, Pointer, Popover, Header, Content, Footer, AdvanceTrigger, BackTrigger, CancelTrigger } from "@glowhop/react-tour";

const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    target: "#first-member",
    title: "This step looks normal",
    content: "Default overlay, popover, and pointer — no overrides here.",
  })
  .step({
    target: "#invite",
    title: "Same tour, fully customized",
    content: "overlay/popover overrides, a custom pointer glyph, and allowInteraction, all at once.",
    overlay: { color: "#0ea5e9", opacity: 0.35 },
    popover: { arrow: { disabled: true }, hideFooter: true },
    behavior: { allowInteraction: true },
  })
  .build();

// Instead of <DefaultTour tour={tour} />, compose the pieces directly. Pointer takes
// per-direction content, not children, so it can show a distinct glyph for each placement:
<Root tour={tour}>
  <Overlay />
  <Pointer directionContent={{ top: "🎯", bottom: "🎯", left: "🎯", right: "🎯" }} />
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

export const liveProgressSource = `import { Root, Overlay, Pointer, Popover, Header, Content, Footer, AdvanceTrigger, BackTrigger, CancelTrigger, useTour } from "@glowhop/react-tour";

const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({ target: "#company-name", title: "Company name", content: "Step 1." })
  .step({ target: "#industry", title: "Industry", content: "Step 2." })
  .step({ target: "#team-size", title: "Team size", content: "Step 3." })
  .step({ target: "#finish-setup", title: "Finish setup", content: "Step 4." })
  .build();

// A custom popover subcomponent, wired to real tour state:
function LiveProgress() {
  const state = useTour();
  return (
    <p>
      Step {state.currentStepIndex + 1} of {state.totalSteps}
    </p>
  );
}

<Root tour={tour}>
  <Overlay />
  <Pointer />
  <Popover>
    <Header />
    <LiveProgress />
    <Content />
    <Footer>
      <CancelTrigger />
      <BackTrigger />
      <AdvanceTrigger />
    </Footer>
  </Popover>
</Root>;

tour.run(workflow);`;
