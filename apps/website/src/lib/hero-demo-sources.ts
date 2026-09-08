// Static source snippets shown next to the hero demos. Kept in sync by hand with
// src/components/HeroDemos.tsx — these are display copies, not imports, so the code shown to
// visitors reads as a clean, standalone example rather than the wired-up demo internals.

export const nonInteractiveSource = `const tour = createGlowTour();

const workflow = tour
  .create("welcome")
  .step({
    id: "workspace-name",
    target: "#workspace-name",
    title: "Start with the workspace name",
    content: "A step can target any element — this one points at a plain field.",
  })
  .step({
    id: "timezone",
    target: "#timezone",
    title: "Then the timezone",
    content: "Chain as many .step() calls as the tour needs.",
  })
  .step({
    id: "save-button",
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
    id: "progress",
    target: "#progress",
    title: "Step 2 of a 3-step wizard",
    content: "This wizard tracks its own progress — the tour just points it out.",
  })
  .step({
    id: "continue",
    target: "#continue",
    title: "Click the target to advance",
    content: "onTargetEvent('click', ...) calls context.advance().",
    popover: { disableAdvanceButton: true },
    behavior: { allowInteraction: true },
  })
  .onTargetEvent("click", (event, context) => context.advance())
  .step({
    id: "continue-2",
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
    id: "widget-a",
    target: "#widget-a",
    title: "Forcing placement: top",
    content: "popover.placementTryOrder: ['top'] pins this popover above its target.",
    popover: { placementTryOrder: ["top"] },
  })
  .step({
    id: "widget-b",
    target: "#widget-b",
    title: "Forcing placement: bottom",
    content: "popover.placementTryOrder: ['bottom'] pins this popover below its target.",
    popover: { placementTryOrder: ["bottom"] },
  })
  .step({
    id: "widget-c",
    target: "#widget-c",
    title: "Forcing placement: left",
    content: "popover.placementTryOrder: ['left'] pins this popover to the left of its target.",
    popover: { placementTryOrder: ["left"] },
  })
  .step({
    id: "widget-d",
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
    id: "load-data",
    target: "#load-data",
    title: "Load the data first",
    content: "The next step waits for an element that doesn't exist yet.",
    behavior: { allowInteraction: true },
  })
  .step({
    id: "loaded-content",
    target: "#loaded-content",
    title: "The tour waited for this",
    content: "waitUntilElement(selector) held the tour until this element appeared.",
  })
  .waitUntilElement("#loaded-content")
  .step({
    id: "activity-row-1",
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
    id: "warning",
    target: "#warning",
    title: "Read this carefully",
    content: "A warning is a good place for a tour step too.",
  })
  .step({
    id: "delete-account",
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
    id: "project-name",
    target: "#project-name",
    title: "Name your project",
    content: "Try pressing Escape, or clicking Cancel below, at any point in this tour.",
  })
  .step({
    id: "create-project",
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
    id: "email-notifications",
    target: "#email-notifications",
    title: "Click the overlay to advance",
    content: "behavior.overlayClick: 'advance' — clicking the dimmed backdrop moves forward.",
    behavior: { overlayClick: "advance" },
  })
  .step({
    id: "push-notifications",
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
    id: "first-member",
    target: "#first-member",
    title: "This step looks normal",
    content: "Default overlay, popover, and pointer — no overrides here.",
  })
  .step({
    id: "invite",
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
  .step({ id: "company-name", target: "#company-name", title: "Company name", content: "Step 1." })
  .step({ id: "industry", target: "#industry", title: "Industry", content: "Step 2." })
  .step({ id: "team-size", target: "#team-size", title: "Team size", content: "Step 3." })
  .step({ id: "finish-setup", target: "#finish-setup", title: "Finish setup", content: "Step 4." })
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

export const themeSource = `const tour = createGlowTour();

const workflow = tour
  .create("billing")
  .step({
    id: "plan",
    target: "#plan",
    title: "One stylesheet, two palettes",
    content: "default.css ships both. With nothing set, the tour follows the OS preference.",
  })
  .step({
    id: "update-plan",
    target: "#update-plan",
    title: "Forced from an attribute",
    content: "data-glow-tour-theme on any ancestor pins a theme.",
  })
  .build();

// Nothing to configure for the OS preference. To pin a theme, put the
// attribute on <html> for the whole page, or on a wrapper for one tour:
<div data-glow-tour-theme="dark">
  <GlowTour.Default tour={tour} />
</div>;

tour.run(workflow);`;

export const longContentSource = `const tour = createGlowTour();

const workflow = tour
  .create("release-notes")
  .step({
    id: "read-notes",
    target: "#read-notes",
    title: "A step with a lot to say",
    content: "The popover caps its height and scrolls its content, so the footer "
      + "buttons stay reachable on a short window.",
  })
  .build();

// Every token can be overridden from any ancestor of the tour. The default
// max-height is the viewport; this demo caps it lower so the scroll is visible
// on any screen:
//   .demo-long-content [data-glow-tour-popover] { max-height: min(320px, 100dvh); }
<div className="demo-long-content" style={{ "--glow-tour-popover-width": "260px" }}>
  <GlowTour.Default tour={tour} />
</div>;

tour.run(workflow);`;

export const customThemeSource = `const tour = createGlowTour();

const workflow = tour
  .create("deploy")
  .step({
    id: "branch",
    target: "#branch",
    title: "$ theming --from-css",
    content: "The same <GlowTour.Default /> as every other example. No styling from JS.",
  })
  .build();

<div className="terminal-tour">
  <GlowTour.Default tour={tour} />
</div>;

/* The whole skin is CSS on an ancestor — the tokens are declared at zero
   specificity, so a plain class wins by proximity: */
.terminal-tour {
  /* not a token: the popover is \`font: inherit\` */
  font-family: ui-monospace, Menlo, Consolas, monospace;

  --glow-tour-color-accent: #35f0a0;
  --glow-tour-color-on-accent: #04150d;
  --glow-tour-color-surface: #071a12;
  --glow-tour-color-surface-muted: #0d2a1d;
  --glow-tour-color-text: #d6ffe9;
  --glow-tour-color-text-muted: #6fbb94;
  --glow-tour-color-border: #1d5c3e;
  --glow-tour-overlay-color: #001b0e;
  --glow-tour-shadow: 0 0 0 1px rgb(53 240 160 / 24%);

  --glow-tour-radius: 2px;
  --glow-tour-spacing: 10px;
  --glow-tour-control-height: 30px;
  --glow-tour-popover-width: 320px;
  --glow-tour-transition-duration: 200ms;
  --glow-tour-transition-easing: steps(5, end);
}

/* The footer is a plain flex row, so its buttons stack full-width from CSS too: */
.terminal-tour [data-glow-tour-footer] {
  flex-direction: column;
  align-items: stretch;
}

/* the default theme pushes Skip away with an inline-end auto margin */
.terminal-tour [data-glow-tour-cancel-trigger] {
  margin-inline-end: 0;
}

tour.run(workflow);`;
