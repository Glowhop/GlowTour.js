// biome-ignore-all assist/source/organizeImports: The removed export needs its own expected-error import.
import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { BeforeActionStepContext } from "../index";
// @ts-expect-error DynamicStepProps is no longer part of the public type contract.
import type { DynamicStepProps } from "../types";
import type {
  PopoverOptions,
  StartOptions,
  StepBehavior,
  StepContext,
  StepParameters,
  StepPropsStore,
} from "../types";
import { WorkflowBuilder } from "./index";

const removedProgressOption: PopoverOptions = {
  // @ts-expect-error PopoverOptions must not expose inactive progress state.
  hideProgressIndicator: true,
};

const removedButtonOption: PopoverOptions = {
  // @ts-expect-error PopoverOptions must not expose inactive button labels.
  buttons: { advanceLabel: "Next" },
};

type StoredStepProps = ReturnType<StepPropsStore<string>["get"]>;

// @ts-expect-error Target resolution must not be exposed through context.props.
const removedTarget: keyof StoredStepProps = "target";
// @ts-expect-error Lifecycle configuration must not be exposed through context.props.
const removedResetPropsOnEnter: keyof StoredStepProps = "resetPropsOnEnter";
// @ts-expect-error Static behavior must not be exposed through context.props.
const removedBehavior: keyof StoredStepProps = "behavior";

const popoverOptions: PopoverOptions = {
  disableAdvanceButton: true,
  disablePreviousButton: true,
  hideAdvanceButton: true,
  hideFooter: true,
  hidePreviousButton: true,
};
const behaviorOptions: StepBehavior = {
  disableAutoFocus: true,
  disableAutoScroll: true,
  scroll: { behavior: "smooth", block: "center", inline: "nearest" },
};
const removedStepScroll: StepParameters<string> = {
  content: "Content",
  target: "#target",
  title: "Title",
  // @ts-expect-error Scroll configuration now belongs to behavior.scroll.
  scroll: { behavior: "smooth" },
};
const removedStartScroll: StartOptions<string> = {
  // @ts-expect-error Scroll configuration now belongs to behavior.scroll.
  scroll: { behavior: "smooth" },
};

void removedProgressOption;
void removedButtonOption;
void removedTarget;
void removedResetPropsOnEnter;
void removedBehavior;
void popoverOptions;
void behaviorOptions;
void removedStepScroll;
void removedStartScroll;
void (null as DynamicStepProps<string> | null);

function assertBeforeActionContext(context: BeforeActionStepContext<string>) {
  const target: HTMLElement = context.target;
  const title: string = context.title;
  const content: string = context.content;
  const data: Readonly<Record<string, string | number | boolean | null>> | undefined = context.data;

  // @ts-expect-error Transition hook snapshots must not be assignable.
  context.title = "Changed";
  // @ts-expect-error Nested transition hook options must be readonly.
  if (context.popover) context.popover.hideFooter = true;
  // @ts-expect-error Transition hooks must not expose the mutable props store.
  context.props;
  // @ts-expect-error Transition hooks must not expose action navigation commands.
  context.advance;
  // @ts-expect-error Transition hooks must not expose the action abort signal.
  context.signal;
  // @ts-expect-error Lifecycle configuration is not part of the hook snapshot.
  context.resetPropsOnEnter;
  // @ts-expect-error Static behavior is not part of the hook snapshot.
  context.behavior;

  void target;
  void title;
  void content;
  void data;
}

void assertBeforeActionContext;

function workflow(name = "builder") {
  return new WorkflowBuilder<string>(name).step({
    content: "Content",
    target: "#target",
    title: "Title",
  });
}

describe("WorkflowBuilder public contract", () => {
  test("types every transition hook with the readonly before-action context", () => {
    const callback = (context: BeforeActionStepContext<string>) => {
      assert.equal(typeof context.title, "string");
    };

    workflow().beforeAdvance(callback).beforePrevious(callback).beforeCancel(callback);
  });

  test("builds a frozen definition through the canonical fluent methods", () => {
    const callback = () => {};
    const definition = workflow()
      .wait(1)
      .do(() => true)
      .onTargetEvent(["click", "keydown"], callback)
      .beforeAdvance(() => {})
      .beforePrevious(() => {})
      .beforeCancel(() => {})
      .do(({ advance }) => advance())
      .build();

    assert.equal(Object.isFrozen(definition), true);
    assert.equal(Object.isFrozen(definition.steps[0].actions), true);
    assert.deepEqual(
      definition.steps[0].eventHandlers.map(({ event }) => event),
      ["click", "keydown"],
    );
    assert.equal(definition.steps[0].eventHandlers[0].callback, callback);
  });

  test("keeps resetPropsOnEnter outside dynamic step props", () => {
    const definition = new WorkflowBuilder<string>("static-reset-policy")
      .step({
        content: "Content",
        resetPropsOnEnter: false,
        target: "#target",
        title: "Title",
      })
      .build();

    assert.equal(definition.steps[0].resetPropsOnEnter, false);
    assert.equal("resetPropsOnEnter" in definition.steps[0].props, false);
  });

  test("does not retain former builder aliases", () => {
    const step = workflow();
    for (const alias of [
      "action",
      "alter",
      "back",
      "exec",
      "finish",
      "goAdvance",
      "goPrevious",
      "advance",
      "onBack",
      "onCancel",
      "onEvent",
      "onAdvance",
      "on",
    ]) {
      assert.equal(alias in step, false, alias);
    }
  });

  test("rejects invalid delay and wait timing options", () => {
    assert.throws(() => workflow().wait(-1), /timeMs/i);
    assert.throws(() => workflow().waitUntil(() => true, { timeout: -1 }), /timeout/i);
    assert.throws(() => workflow().waitUntilElement("#ready", { interval: 0 }), /interval/i);
  });
});

function createContext(
  signal = new AbortController().signal,
  target = {} as HTMLElement,
): StepContext<string> {
  return {
    advance: async () => {},
    cancel: async () => {},
    previous: async () => {},
    props: {} as StepContext<string>["props"],
    signal,
    target,
  };
}

describe("StepBuilder.onTargetEvent", () => {
  test("infers the DOM event type from one event name", () => {
    new WorkflowBuilder<string>("single-event")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent("click", (event) => {
        const clickEvent: MouseEvent = event;
        assert.equal(clickEvent.type, event.type);
      });
  });

  test("infers a union from multiple event names", () => {
    new WorkflowBuilder<string>("multiple-events")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent(["click", "keydown"], (event) => {
        const domEvent: MouseEvent | KeyboardEvent = event;
        assert.equal(domEvent.type, event.type);
      });
  });

  test("accepts a typed custom event", () => {
    new WorkflowBuilder<string>("custom-event")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent<CustomEvent<{ value: number }>>("tour:complete", (event) => {
        const value: number = event.detail.value;
        assert.equal(value, event.detail.value);
      });
  });

  test("registers one handler for every event name", () => {
    const callback = () => {};
    const workflow = new WorkflowBuilder<string>("multiple-events")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent(["click", "keydown"], callback)
      .build();

    assert.deepEqual(
      workflow.steps[0].eventHandlers.map(({ event }) => event),
      ["click", "keydown"],
    );
    assert.equal(workflow.steps[0].eventHandlers[0].callback, callback);
    assert.equal(workflow.steps[0].eventHandlers[1].callback, callback);
  });
});

describe("StepBuilder action contract", () => {
  test("waitUntil retries until its predicate succeeds", async () => {
    let attempts = 0;
    const workflow = new WorkflowBuilder<string>("wait-until")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(
        () => {
          attempts += 1;
          return attempts === 3;
        },
        { interval: 1, timeout: 100 },
      )
      .build();

    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    assert.equal(await action(createContext()), true);
    assert.equal(attempts, 3);
  });

  test("waitUntil stops when its signal is aborted", async () => {
    const controller = new AbortController();
    const workflow = new WorkflowBuilder<string>("cancel-wait")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => false, { interval: 10, timeout: 100 })
      .build();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    controller.abort();
    await assert.rejects(async () => action(createContext(controller.signal)), {
      name: "AbortError",
    });
  });

  test("waitUntil aborts while an async predicate is pending", async () => {
    const controller = new AbortController();
    const workflow = new WorkflowBuilder<string>("cancel-pending-predicate")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)), {
        interval: 1,
        timeout: 100,
      })
      .build();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    const startedAt = Date.now();
    const result = action(createContext(controller.signal));
    await Promise.resolve();
    controller.abort();

    await assert.rejects(async () => result, { name: "AbortError" });
    assert.ok(Date.now() - startedAt < 30);
  });

  test("waitUntil enforces its timeout while an async predicate is pending", async () => {
    const workflow = new WorkflowBuilder<string>("timeout-pending-predicate")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)), {
        interval: 100,
        timeout: 5,
      })
      .build();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    const startedAt = Date.now();
    await assert.rejects(async () => action(createContext()), /waitUntil timed out after 5ms/);
    assert.ok(Date.now() - startedAt < 30);
  });

  test("waitUntil throws after its timeout", async () => {
    const workflow = new WorkflowBuilder<string>("timeout-wait")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => false, { interval: 1, timeout: 0 })
      .build();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    await assert.rejects(async () => action(createContext()), /waitUntil timed out after 0ms/);
  });

  test("waitUntilElement polls its target owner document until the selector resolves", async () => {
    let queries = 0;
    const target = {
      ownerDocument: {
        querySelector: () => {
          queries += 1;
          return queries === 2 ? {} : null;
        },
      },
    } as unknown as HTMLElement;
    const workflow = new WorkflowBuilder<string>("wait-until-element")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntilElement("#ready", { interval: 1, timeout: 100 })
      .build();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    assert.equal(await action(createContext(undefined, target)), true);
    assert.equal(queries, 2);
  });

  test("validates timing values when defining the workflow", () => {
    const step = new WorkflowBuilder<string>("validation").step({
      content: "Content",
      target: "#target",
      title: "Title",
    });

    assert.throws(() => step.wait(-1), /finite non-negative number/);
    assert.throws(() => step.wait(Number.NaN), /finite non-negative number/);
    assert.throws(() => step.wait(Number.POSITIVE_INFINITY), /finite non-negative number/);
    assert.throws(() => step.waitUntil(() => true, { interval: -1 }), /finite positive number/);
    assert.throws(() => step.waitUntilElement(""), /selector must not be empty/);
    assert.throws(() => step.onTargetEvent([], () => {}), /events must not be empty/);
  });

  test("exposes navigation through the action context", async () => {
    const calls: string[] = [];
    const step = new WorkflowBuilder<string>("navigation-actions").step({
      content: "Content",
      target: "#target",
      title: "Title",
    });

    assert.equal("goAdvance" in step, false);
    assert.equal("goPrevious" in step, false);
    assert.equal("advance" in step, false);
    assert.equal("previous" in step, false);
    assert.equal("onBack" in step, false);

    const workflow = step
      .do(({ advance }) => advance())
      .do(({ previous }) => previous())
      .do(({ cancel }) => cancel())
      .build();

    const context = createContext();
    context.advance = async () => {
      calls.push("advance");
    };
    context.previous = async () => {
      calls.push("previous");
    };
    context.cancel = async () => {
      calls.push("cancel");
    };
    for (const action of workflow.steps[0].actions) {
      if (typeof action === "function") await action(context);
    }

    assert.deepEqual(calls, ["advance", "previous", "cancel"]);
  });
});

describe("StepBuilder lifecycle", () => {
  test("rejects mutations through a stale step handle", () => {
    const first = new WorkflowBuilder<string>("stale-step").step({
      content: "First",
      target: "#first",
      title: "First",
    });
    first.step({ content: "Second", target: "#second", title: "Second" });

    assert.throws(() => first.do(() => {}), /StepBuilder is no longer active/);
  });

  test("rejects mutations after finish", () => {
    const step = new WorkflowBuilder<string>("finished-step").step({
      content: "Content",
      target: "#target",
      title: "Title",
    });
    step.build();

    assert.throws(() => step.beforeAdvance(() => {}), /StepBuilder is no longer active/);
  });
});

describe("StepBuilder.append", () => {
  test("appends an immutable workflow definition", () => {
    const reusable = new WorkflowBuilder<string>("reusable")
      .step({
        content: "Reusable",
        resetPropsOnEnter: false,
        target: "#reusable",
        title: "Reusable",
      })
      .build();
    const workflow = new WorkflowBuilder<string>("composed")
      .step({ content: "First", target: "#first", title: "First" })
      .append(reusable)
      .build();

    assert.deepEqual(
      workflow.steps.map((step) => step.props.title),
      ["First", "Reusable"],
    );
    assert.equal(workflow.steps[1].resetPropsOnEnter, false);
    assert.equal("resetPropsOnEnter" in workflow.steps[1].props, false);
  });

  test("rejects an empty workflow definition", () => {
    const empty = new WorkflowBuilder<string>("empty").build();
    const step = new WorkflowBuilder<string>("composed").step({
      content: "First",
      target: "#first",
      title: "First",
    });

    assert.throws(() => step.append(empty), /Cannot append a workflow without steps/);
  });
});
