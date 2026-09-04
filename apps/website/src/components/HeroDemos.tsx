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
} from "@glowhop/react-tour";
import { Bell, Search, Settings, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Avatar, DecorativeIconButton, DemoCard, FakeField, SkeletonLine } from "./demo-ui";

const targetButtonClass =
  "rounded-[var(--radius-glow)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)]";
const runButtonClass =
  "rounded-[var(--radius-glow)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]";
const primaryButtonClass =
  "rounded-[var(--radius-glow)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]";

const singleTour = createGlowTour();
const singleWorkflow = singleTour
  .create("hero-single")
  .step({
    target: "#hero-single-field-name",
    title: "Start with the workspace name",
    content: "A step can target any element — this one points at a plain field.",
  })
  .step({
    target: "#hero-single-field-timezone",
    title: "Then the timezone",
    content: "Chain as many .step() calls as the tour needs.",
  })
  .step({
    target: "#hero-single-target",
    title: "One step, zero setup",
    content: "Point at an element, describe it, and build. That's the whole tour.",
  })
  .build();

export function SingleStepDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-5">
        <h4 className="text-sm font-semibold text-[var(--color-text)]">Workspace settings</h4>
        <div className="mt-4 space-y-3">
          <FakeField id="hero-single-field-name" label="Workspace name" value="Acme Inc." />
          <FakeField id="hero-single-field-timezone" label="Timezone" value="UTC-08:00 Pacific" />
        </div>
        <div className="mt-4 flex justify-end border-t border-[var(--color-border)] pt-4">
          <button id="hero-single-target" type="button" className={primaryButtonClass}>
            Save changes
          </button>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void singleTour.run(singleWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={singleTour} />
    </div>
  );
}

const multiTour = createGlowTour();
const multiWorkflow = multiTour
  .create("hero-multi")
  .step({
    target: "#hero-multi-search",
    title: "A normal element works too",
    content: "The tour can point at any element — no special markup needed.",
  })
  .step({
    target: "#hero-multi-target-1",
    title: "Placement tries top first",
    content: "This step's popover.placementTryOrder starts with top.",
    popover: { placementTryOrder: ["top", "bottom"] },
  })
  .step({
    target: "#hero-multi-target-2",
    title: "Then falls back automatically",
    content: "If there's no room, Glow Tour walks the list until one fits.",
    popover: { placementTryOrder: ["right", "left", "bottom"] },
  })
  .build();

export function MultiStepDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--color-text)]">Invoices</h4>
          <div className="flex items-center gap-2">
            <DecorativeIconButton>
              <Bell className="h-4 w-4" />
            </DecorativeIconButton>
            <DecorativeIconButton>
              <Settings className="h-4 w-4" />
            </DecorativeIconButton>
          </div>
        </div>
        <div
          id="hero-multi-search"
          className="mt-3 flex items-center gap-2 rounded-[var(--radius-glow)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[var(--color-text-muted)]"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">Search invoices…</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button id="hero-multi-target-1" type="button" className={targetButtonClass}>
            Filters
          </button>
          <button id="hero-multi-target-2" type="button" className={targetButtonClass}>
            Export
          </button>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void multiTour.run(multiWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={multiTour} />
    </div>
  );
}

const programmaticTour = createGlowTour();
const programmaticWorkflow = programmaticTour
  .create("hero-programmatic", {
    onStart: () => console.log("[glow-tour demo] onStart"),
    onFinish: () => console.log("[glow-tour demo] onFinish"),
  })
  .step({
    target: "#hero-programmatic-title",
    title: "This doc has a title",
    content: "A quick step on the title before we get to the code.",
  })
  .step({
    target: "#hero-programmatic-target",
    title: "Steps can run code",
    content: "This step waits, then runs a callback before it's considered ready.",
  })
  .wait(300)
  .do(() => console.log("[glow-tour demo] do() ran after the wait"))
  .build();

export function ProgrammaticDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-4">
        <div className="flex items-center justify-between gap-3">
          <SkeletonLine id="hero-programmatic-title" width="55%" className="h-3" />
          <button id="hero-programmatic-target" type="button" className={primaryButtonClass}>
            Publish
          </button>
        </div>
        <div className="mt-4 space-y-2">
          <SkeletonLine width="95%" />
          <SkeletonLine width="88%" />
          <SkeletonLine width="60%" />
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void programmaticTour.run(programmaticWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={programmaticTour} />
    </div>
  );
}

const interactionTour = createGlowTour();
const interactionWorkflow = interactionTour
  .create("hero-interaction")
  .step({
    target: "#hero-interaction-avatar",
    title: "Riley Martin's post",
    content: "This tour walks through a single post in the feed.",
  })
  .step({
    target: "#hero-interaction-target",
    title: "The target stays clickable",
    content:
      "behavior.allowInteraction lets pointer events pass through the overlay. Try clicking the counter.",
    behavior: { allowInteraction: true },
  })
  .build();

export function InteractionAllowedDemo() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-4">
        <div className="flex items-start gap-3">
          <Avatar id="hero-interaction-avatar" initials="RM" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--color-text)]">Riley Martin</p>
            <p className="text-xs text-[var(--color-text-muted)]">2 hours ago</p>
            <div className="mt-2 space-y-2">
              <SkeletonLine width="100%" />
              <SkeletonLine width="70%" />
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end border-t border-[var(--color-border)] pt-3">
          <button
            id="hero-interaction-target"
            type="button"
            onClick={() => setCount((value) => value + 1)}
            className={targetButtonClass}
          >
            ♥ Liked {count}
          </button>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void interactionTour.run(interactionWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={interactionTour} />
    </div>
  );
}

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

const customStylingTour = createGlowTour();
const customStylingWorkflow = customStylingTour
  .create("hero-custom-styling")
  .step({
    target: "#hero-custom-styling-member",
    title: "This step looks normal",
    content: "Default overlay and popover styling — no overrides here.",
  })
  .step({
    target: "#hero-custom-styling-target",
    title: "Same tour, different skin",
    content:
      "overlay.color/opacity and popover.arrow/hideFooter are real per-workflow overrides, not just theme CSS.",
    overlay: { color: "#0ea5e9", opacity: 0.35 },
    popover: { arrow: { disabled: true }, hideFooter: true },
  })
  .build();

const teamMembers = [
  { initials: "AK", name: "Ava Kim" },
  { initials: "JD", name: "Jordan Diaz" },
  { initials: "SP", name: "Sam Patel" },
];

export function CustomStylingDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Team members
          </h4>
          <button id="hero-custom-styling-target" type="button" className={primaryButtonClass}>
            Invite teammates
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {teamMembers.map((member, index) => (
            <li
              key={member.initials}
              id={index === 0 ? "hero-custom-styling-member" : undefined}
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
        onClick={() => void customStylingTour.run(customStylingWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <DefaultTour tour={customStylingTour} />
    </div>
  );
}

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

const customIndicatorTour = createGlowTour();
const customIndicatorWorkflow = customIndicatorTour
  .create("hero-custom-indicator")
  .step({
    target: "#hero-custom-indicator-target",
    title: "A custom indicator",
    content:
      "This tour composes Root/Overlay/Pointer/Popover directly and gives Pointer its own children instead of the default glyph. The indicator only renders when behavior.allowInteraction is true.",
    behavior: { allowInteraction: true },
  })
  .build();

export function CustomIndicatorDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DemoCard className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--color-text)]">Plan</h4>
          <span className="text-xs text-[var(--color-text-muted)]">Free tier</span>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-[var(--radius-glow)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
          <span className="text-sm text-[var(--color-text)]">3 of 3 projects used</span>
          <button id="hero-custom-indicator-target" type="button" className={primaryButtonClass}>
            Upgrade plan
          </button>
        </div>
      </DemoCard>
      <button
        type="button"
        onClick={() => void customIndicatorTour.run(customIndicatorWorkflow)}
        className={runButtonClass}
      >
        Run this demo
      </button>
      <Root tour={customIndicatorTour}>
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
      </Root>
    </div>
  );
}
