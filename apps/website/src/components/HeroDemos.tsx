import "@glowhop/styles-tour/default.css";
import {
  AdvanceTrigger,
  BackTrigger,
  CancelTrigger,
  Content,
  createGlowTour,
  DefaultTour,
  Footer,
  Header,
  Overlay,
  Pointer,
  Popover,
  Root,
  useTour,
} from "@glowhop/react-tour";
import { Bell, Rocket, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Avatar, DemoCard, FakeField, SkeletonLine } from "./demo-ui";

const targetButtonClass =
  "rounded-[var(--radius-glow)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)]";
const runButtonClass =
  "rounded-[var(--radius-glow)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]";
const primaryButtonClass =
  "rounded-[var(--radius-glow)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]";

// 1. Non-interactive, 3 steps ------------------------------------------------

const nonInteractiveTour = createGlowTour();
const nonInteractiveWorkflow = nonInteractiveTour
  .create("hero-non-interactive")
  .step({
    target: "#hero-non-interactive-field-name",
    title: "Start with the workspace name",
    content: "A step can target any element — this one points at a plain field.",
  })
  .step({
    target: "#hero-non-interactive-field-timezone",
    title: "Then the timezone",
    content: "Chain as many .step() calls as the tour needs.",
  })
  .step({
    target: "#hero-non-interactive-target",
    title: "A plain, non-interactive walkthrough",
    content: "No special options here — no allowInteraction, no custom behavior. Just steps.",
  })
  .build();

export function NonInteractiveDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-5">
        <h4 className="text-sm font-semibold text-[var(--color-text)]">Workspace settings</h4>
        <div className="mt-4 space-y-3">
          <FakeField
            id="hero-non-interactive-field-name"
            label="Workspace name"
            value="Acme Inc."
          />
          <FakeField
            id="hero-non-interactive-field-timezone"
            label="Timezone"
            value="UTC-08:00 Pacific"
          />
        </div>
        <div className="mt-4 flex justify-end border-t border-[var(--color-border)] pt-4">
          <button id="hero-non-interactive-target" type="button" className={primaryButtonClass}>
            Save changes
          </button>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void nonInteractiveTour.run(nonInteractiveWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={nonInteractiveTour} />
    </div>
  );
}

// 2. Interactive: click target to advance ------------------------------------

const advanceOnClickTour = createGlowTour();
const advanceOnClickWorkflow = advanceOnClickTour
  .create("hero-advance-on-click")
  .step({
    target: "#hero-advance-progress",
    title: "Step 2 of a 3-step wizard",
    content: "This wizard tracks its own progress — the tour just points it out.",
  })
  .step({
    target: "#hero-advance-on-click-target",
    title: "Click the target to advance",
    content: "onTargetEvent('click', ...) calls context.advance() from a real DOM click.",
    popover: { hideAdvanceButton: true },
    behavior: { allowInteraction: true },
  })
  .onTargetEvent("click", (_event, context) => context.advance())
  .step({
    target: "#hero-advance-on-click-target",
    title: "That advanced the tour",
    content:
      "No popover button was involved — the click on the target itself moved the workflow forward.",
  })
  .build();

export function AdvanceOnClickDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-5">
        <div id="hero-advance-progress" className="flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-border)]" aria-hidden="true" />
          <span className="h-1.5 w-5 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-border)]" aria-hidden="true" />
        </div>
        <p className="mt-3 text-center text-xs font-medium text-[var(--color-text-muted)]">
          Step 2 of 3
        </p>
        <p className="mt-2 text-center text-sm text-[var(--color-text)]">
          Connect a data source to keep going.
        </p>
        <div className="mt-4 flex justify-center">
          <button id="hero-advance-on-click-target" type="button" className={primaryButtonClass}>
            Continue
          </button>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void advanceOnClickTour.run(advanceOnClickWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={advanceOnClickTour} />
    </div>
  );
}

// 3. 4 steps, each a different popover.placementTryOrder --------------------

const placementOrderTour = createGlowTour();
const placementOrderWorkflow = placementOrderTour
  .create("hero-placement-order")
  .step({
    target: "#hero-placement-target-top",
    title: "Forcing placement: top",
    content: "popover.placementTryOrder: ['top'] pins this popover above its target.",
    popover: { placementTryOrder: ["top"] },
  })
  .step({
    target: "#hero-placement-target-bottom",
    title: "Forcing placement: bottom",
    content: "popover.placementTryOrder: ['bottom'] pins this popover below its target.",
    popover: { placementTryOrder: ["bottom"] },
  })
  .step({
    target: "#hero-placement-target-left",
    title: "Forcing placement: left",
    content: "popover.placementTryOrder: ['left'] pins this popover to the left of its target.",
    popover: { placementTryOrder: ["left"] },
  })
  .step({
    target: "#hero-placement-target-right",
    title: "Forcing placement: right",
    content: "popover.placementTryOrder: ['right'] pins this popover to the right of its target.",
    popover: { placementTryOrder: ["right"] },
  })
  .build();

export function PlacementOrderDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-6">
        <h4 className="text-sm font-semibold text-[var(--color-text)]">Dashboard</h4>
        <div className="mt-6 flex h-36 flex-col justify-between">
          <div className="flex justify-between">
            <button id="hero-placement-target-top" type="button" className={targetButtonClass}>
              Widget A
            </button>
            <button id="hero-placement-target-bottom" type="button" className={targetButtonClass}>
              Widget B
            </button>
          </div>
          <div className="flex justify-between">
            <button id="hero-placement-target-left" type="button" className={targetButtonClass}>
              Widget C
            </button>
            <button id="hero-placement-target-right" type="button" className={targetButtonClass}>
              Widget D
            </button>
          </div>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void placementOrderTour.run(placementOrderWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={placementOrderTour} />
    </div>
  );
}

// 4. Async element wait -------------------------------------------------------

const waitForAsyncTour = createGlowTour();
const waitForAsyncWorkflow = waitForAsyncTour
  .create("hero-wait-for-async")
  .step({
    target: "#hero-wait-for-async-target",
    title: "Load the data first",
    content: 'Click "Load data" — the next step waits for an element that doesn\'t exist yet.',
    behavior: { allowInteraction: true },
  })
  .step({
    target: "#hero-wait-for-async-loaded",
    title: "The tour waited for this",
    content: "waitUntilElement(selector) held the tour until this element appeared in the DOM.",
  })
  .waitUntilElement("#hero-wait-for-async-loaded")
  .step({
    target: "#hero-wait-for-async-row-1",
    title: "Real content, not a skeleton",
    content: "By now the list has actually loaded — this row is the real thing.",
  })
  .build();

const activityRows = [
  { initials: "TL", label: "Taylor logged in" },
  { initials: "MR", label: "Morgan updated billing" },
  { initials: "CJ", label: "Casey invited a teammate" },
];

export function WaitForAsyncDemo() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--color-text)]">Recent activity</h4>
          <button
            id="hero-wait-for-async-target"
            type="button"
            onClick={() => setTimeout(() => setLoaded(true), 1200)}
            className={targetButtonClass}
          >
            Load data
          </button>
        </div>
        <div className="mt-3 min-h-24">
          {loaded ? (
            <ul id="hero-wait-for-async-loaded" className="space-y-3">
              {activityRows.map((row, index) => (
                <li
                  key={row.initials}
                  id={index === 0 ? "hero-wait-for-async-row-1" : undefined}
                  className="flex items-center gap-3"
                >
                  <Avatar initials={row.initials} />
                  <span className="text-sm text-[var(--color-text)]">{row.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex h-24 items-center justify-center text-xs text-[var(--color-text-muted)]">
              No activity loaded yet.
            </p>
          )}
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void waitForAsyncTour.run(waitForAsyncWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={waitForAsyncTour} />
    </div>
  );
}

// 5. cancellable: false --------------------------------------------------------

const cancellableTour = createGlowTour();
const cancellableWorkflow = cancellableTour
  .create("hero-cancellable", {
    cancellable: false,
  })
  .step({
    target: "#hero-cancellable-warning",
    title: "Read this carefully",
    content: "A warning is a good place for a tour step too.",
  })
  .step({
    target: "#hero-cancellable-target",
    title: "This step can't be skipped",
    content: "cancellable: false disables Escape and the Cancel button for the whole tour.",
  })
  .build();

export function CancellableDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-4">
        <div className="rounded-[var(--radius-glow)] border border-red-600/30 bg-red-600/5 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-red-600">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Danger zone
          </h4>
          <p id="hero-cancellable-warning" className="mt-1 text-xs text-[var(--color-text-muted)]">
            This permanently deletes your account and all of its data.
          </p>
          <button
            id="hero-cancellable-target"
            type="button"
            className="mt-3 rounded-[var(--radius-glow)] border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-600/10"
          >
            Delete account
          </button>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void cancellableTour.run(cancellableWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={cancellableTour} />
    </div>
  );
}

// 6. Prevent cancel via onCancel + confirm() ----------------------------------

const confirmCancelTour = createGlowTour();
const confirmCancelWorkflow = confirmCancelTour
  .create("hero-confirm-cancel", {
    cancellable: true,
    onCancel: (context) => {
      if (!window.confirm("Cancel this tour?")) {
        context.abort();
      }
    },
  })
  .step({
    target: "#hero-confirm-cancel-field",
    title: "Name your project",
    content: "Try pressing Escape, or clicking Cancel below, at any point in this tour.",
  })
  .step({
    target: "#hero-confirm-cancel-target",
    title: "Confirm before you leave",
    content:
      "onCancel opens a real window.confirm() dialog. Choosing Cancel there calls context.abort(), which keeps this tour open instead of closing it.",
  })
  .build();

export function ConfirmCancelDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-5">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <Rocket className="h-4 w-4" aria-hidden="true" />
          New project
        </h4>
        <div className="mt-4 space-y-3">
          <FakeField id="hero-confirm-cancel-field" label="Project name" value="Untitled project" />
        </div>
        <div className="mt-4 flex justify-end border-t border-[var(--color-border)] pt-4">
          <button id="hero-confirm-cancel-target" type="button" className={primaryButtonClass}>
            Create project
          </button>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void confirmCancelTour.run(confirmCancelWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={confirmCancelTour} />
    </div>
  );
}

// 7. overlayClick behaviour ----------------------------------------------------

const overlayClickTour = createGlowTour();
const overlayClickWorkflow = overlayClickTour
  .create("hero-overlay-click")
  .step({
    target: "#hero-overlay-click-target-1",
    title: "Click the overlay to advance",
    content:
      "behavior.overlayClick: 'advance' — click anywhere on the dimmed backdrop (not this card) to move to the next step.",
    behavior: { overlayClick: "advance" },
  })
  .step({
    target: "#hero-overlay-click-target-2",
    title: "Now it cancels instead",
    content:
      "This step sets behavior.overlayClick: 'cancel' — clicking the backdrop now cancels the tour instead of advancing it.",
    behavior: { overlayClick: "cancel" },
  })
  .build();

export function OverlayClickDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-5">
        <h4 className="text-sm font-semibold text-[var(--color-text)]">Notification preferences</h4>
        <div className="mt-4 space-y-3">
          <div
            id="hero-overlay-click-target-1"
            className="flex items-center justify-between rounded-[var(--radius-glow)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2"
          >
            <span className="text-sm text-[var(--color-text)]">Email notifications</span>
            <Bell className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
          </div>
          <div
            id="hero-overlay-click-target-2"
            className="flex items-center justify-between rounded-[var(--radius-glow)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2"
          >
            <span className="text-sm text-[var(--color-text)]">Push notifications</span>
            <Bell className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
          </div>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void overlayClickTour.run(overlayClickWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={overlayClickTour} />
    </div>
  );
}

// 8. Custom popover CSS + custom indicator, with an allowInteraction step ----

const customStyledIndicatorTour = createGlowTour();
const customStyledIndicatorWorkflow = customStyledIndicatorTour
  .create("hero-custom-styled-indicator")
  .step({
    target: "#hero-custom-styled-member",
    title: "This step looks normal",
    content: "Default overlay, popover, and pointer — no overrides here.",
  })
  .step({
    target: "#hero-custom-styled-target",
    title: "Same tour, fully customized",
    content:
      "overlay.color/opacity, popover.arrow/hideFooter, a custom <Pointer> glyph, and behavior.allowInteraction, all at once.",
    overlay: { color: "#0ea5e9", opacity: 0.35 },
    popover: { arrow: { disabled: true }, hideFooter: true },
    behavior: { allowInteraction: true },
  })
  .build();

const customStyledTeamMembers = [
  { initials: "AK", name: "Ava Kim" },
  { initials: "JD", name: "Jordan Diaz" },
  { initials: "SP", name: "Sam Patel" },
];

export function CustomStyledIndicatorDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Team members
          </h4>
          <button id="hero-custom-styled-target" type="button" className={primaryButtonClass}>
            Invite teammates
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {customStyledTeamMembers.map((member, index) => (
            <li
              key={member.initials}
              id={index === 0 ? "hero-custom-styled-member" : undefined}
              className="flex items-center gap-3"
            >
              <Avatar initials={member.initials} />
              <SkeletonLine width="45%" />
              <span className="sr-only">{member.name}</span>
            </li>
          ))}
        </ul>
      </DemoCard>
      <button
        type="button"
        onClick={() => void customStyledIndicatorTour.run(customStyledIndicatorWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <Root tour={customStyledIndicatorTour}>
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
      </Root>
    </div>
  );
}

// 9. Custom popover component showing live progress --------------------------

const liveProgressTour = createGlowTour();
const liveProgressWorkflow = liveProgressTour
  .create("hero-live-progress")
  .step({
    target: "#hero-live-progress-field-1",
    title: "Company name",
    content: "The counter above this title is real state from useTour(), not a hardcoded label.",
  })
  .step({
    target: "#hero-live-progress-field-2",
    title: "Industry",
    content: "Advance again — the counter updates because it reads useTour().currentStepIndex.",
  })
  .step({
    target: "#hero-live-progress-field-3",
    title: "Team size",
    content: "Same custom popover component, still driven by live tour state.",
  })
  .step({
    target: "#hero-live-progress-target",
    title: "Finish setup",
    content: "Last step — the counter now reads the final index.",
  })
  .build();

function LiveProgress() {
  const state = useTour();
  return (
    <p className="px-4 pt-3 text-xs font-semibold text-[var(--color-accent)]">
      Step {state.currentStepIndex + 1} of {state.totalSteps}
    </p>
  );
}

export function LiveProgressDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-5">
        <h4 className="text-sm font-semibold text-[var(--color-text)]">Account setup</h4>
        <div className="mt-4 space-y-3">
          <FakeField id="hero-live-progress-field-1" label="Company name" value="Acme Inc." />
          <FakeField id="hero-live-progress-field-2" label="Industry" value="Software" />
          <FakeField id="hero-live-progress-field-3" label="Team size" value="11–50 people" />
        </div>
        <div className="mt-4 flex justify-end border-t border-[var(--color-border)] pt-4">
          <button id="hero-live-progress-target" type="button" className={primaryButtonClass}>
            Finish setup
          </button>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void liveProgressTour.run(liveProgressWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <Root tour={liveProgressTour}>
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
      </Root>
    </div>
  );
}
