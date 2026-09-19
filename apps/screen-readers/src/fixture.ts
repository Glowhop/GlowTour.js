import type { GlowTour, WorkflowDefinition } from "@glowhop/core-tour";

export const ADAPTERS = ["react", "vue", "solid", "angular", "vanilla"] as const;
export type AdapterName = (typeof ADAPTERS)[number];

/** Text of each step, shared by the fixture and the assertions on what screen readers announce. */
export const STEP_TEXT = {
  welcome: {
    title: "Welcome to the tour",
    content: "This first step highlights the page heading.",
  },
  field: {
    title: "Name field",
    content: "Type your name in this field, then continue.",
  },
  finish: {
    title: "All done",
    content: "This is the last step of the tour.",
  },
} as const;

/**
 * Three steps covering the states a screen reader must handle: a modal step, a step that lets the
 * user interact with its target (not modal), and the last step.
 *
 * `text` turns a string into the adapter's content type; every adapter accepts plain strings.
 */
export function buildWorkflow<T>(
  tour: GlowTour<T>,
  text: (value: string) => T,
): WorkflowDefinition<T> {
  return tour
    .create("screen-reader")
    .step({
      id: "welcome",
      target: "#target-welcome",
      title: text(STEP_TEXT.welcome.title),
      content: text(STEP_TEXT.welcome.content),
    })
    .step({
      id: "field",
      target: "#target-field",
      title: text(STEP_TEXT.field.title),
      content: text(STEP_TEXT.field.content),
      behavior: { allowInteraction: true },
    })
    .step({
      id: "finish",
      target: "#target-finish",
      title: text(STEP_TEXT.finish.title),
      content: text(STEP_TEXT.finish.content),
    })
    .build();
}

/** Renders the adapter's default tour into `host` and returns a function that starts the tour. */
export type MountFixture = (host: HTMLElement) => Promise<() => Promise<void>>;
