import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

let window: Window;

beforeEach(() => {
  window = new Window();
  Object.assign(globalThis, {
    Event: window.Event,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    KeyboardEvent: window.KeyboardEvent,
    MouseEvent: window.MouseEvent,
    MutationObserver: window.MutationObserver,
    Node: window.Node,
    ResizeObserver: window.ResizeObserver,
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    SVGElement: window.SVGElement,
    SVGSVGElement: window.SVGSVGElement,
    document: window.document,
    window,
  });
});

afterEach(() => {
  window.close();
});

describe("vue adapter browser behavior", () => {
  test("exposes reactive tour state to descendants", async () => {
    const [{ createApp, defineComponent, h, nextTick }, runtime] = await Promise.all([
      import("vue"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = runtime.createGlowTour();
    const workflow = tour
      .create("reactive state")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .finish();
    const Observer = defineComponent({
      setup() {
        const state = runtime.useTour();
        return () => h("output", `${state.value.status}:${state.value.currentStepIndex}`);
      },
    });
    const app = createApp({
      render: () => h(runtime.GlowTourRoot, { tour }, () => h(Observer)),
    });
    app.mount(container);
    await tour.run(workflow);
    await nextTick();
    assert.equal(container.querySelector("output")?.textContent, "active:0");
    await tour.advance();
    await nextTick();
    assert.equal(container.querySelector("output")?.textContent, "active:1");
    app.unmount();
  });

  test("connects before an immediate run after synchronous mount", async () => {
    const [{ createApp, h }, runtime] = await Promise.all([import("vue"), import("./index")]);
    const container = document.createElement("div");
    document.body.append(container);
    const tour = runtime.createGlowTour();
    const app = createApp({ render: () => h(runtime.GlowTourRoot, { tour }) });

    app.mount(container);
    await assert.doesNotReject(() => tour.run(tour.create("immediate mount").finish()));
    app.unmount();
  });

  test("connects before a descendant mounted hook runs a tour", async () => {
    const [{ createApp, defineComponent, h, onMounted }, runtime] = await Promise.all([
      import("vue"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const tour = runtime.createGlowTour();
    let mountedRun: Promise<void> | undefined;
    const Runner = defineComponent({
      setup() {
        onMounted(() => {
          mountedRun = tour.run(tour.create("descendant mount").finish());
        });
        return () => h("div");
      },
    });
    const app = createApp({
      render: () => h(runtime.GlowTourRoot, { tour }, () => h(Runner)),
    });

    app.mount(container);
    const run = mountedRun;
    assert.ok(run);
    await assert.doesNotReject(run);
    app.unmount();
  });

  test("batches a parent tour and prefix update into one lease replacement", async () => {
    const [{ createApp, h, nextTick, ref }, runtime] = await Promise.all([
      import("vue"),
      import("./index"),
    ]);
    const calls: string[] = [];
    const bridgeSymbol = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");
    const fakeTour = (name: string) => {
      const tour = {};
      Object.defineProperty(tour, bridgeSymbol, {
        configurable: true,
        value: {
          connectRoot: ({ idPrefix }: { idPrefix?: string }) => {
            const prefix = idPrefix ?? "glow-tour";
            calls.push(`connect:${name}:${prefix}`);
            return {
              bindOverlay: () => () => {},
              bindPointer: () => () => {},
              bindPopover: () => () => {},
              ids: {
                description: `${prefix}-description`,
                popover: `${prefix}-popover`,
                root: `${prefix}-root`,
                title: `${prefix}-title`,
              },
              release: () => calls.push(`release:${name}:${prefix}`),
            };
          },
          version: 1,
        },
      });
      return tour as ReturnType<typeof runtime.createGlowTour>;
    };
    const container = document.createElement("div");
    document.body.append(container);
    const first = fakeTour("first");
    const second = fakeTour("second");
    const activeTour = ref(first);
    const prefix = ref("first-prefix");
    const app = createApp({
      render: () => h(runtime.GlowTourRoot, { idPrefix: prefix.value, tour: activeTour.value }),
    });

    app.mount(container);
    assert.deepEqual(calls, ["connect:first:first-prefix"]);
    calls.length = 0;

    activeTour.value = second;
    prefix.value = "second-prefix";
    await nextTick();
    assert.deepEqual(calls, ["release:first:first-prefix", "connect:second:second-prefix"]);

    calls.length = 0;
    app.unmount();
    assert.deepEqual(calls, ["release:second:second-prefix"]);
  });

  test("mounts scoped components with coherent client IDs", async () => {
    const [{ createApp, h, nextTick }, runtime] = await Promise.all([
      import("vue"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const tour = runtime.createGlowTour();
    const app = createApp({
      render: () =>
        h(runtime.GlowTourRoot, { idPrefix: "vue", tour }, () => [
          h(runtime.GlowTourPopover, null, () => [
            h(runtime.GlowTourHeader),
            h(runtime.GlowTourContent),
          ]),
        ]),
    });

    app.mount(container);
    await nextTick();

    const root = container.querySelector<HTMLElement>("[data-glow-tour-root]");
    const popover = container.querySelector<HTMLElement>("[data-glow-tour-popover]");
    assert.equal(root?.id, "vue-root");
    assert.equal(popover?.id, "vue-popover");
    assert.equal(popover?.getAttribute("aria-labelledby"), "vue-title");
    assert.equal(popover?.getAttribute("aria-describedby"), "vue-description");
    app.unmount();

    const remount = createApp({ render: () => h(runtime.GlowTourRoot, { idPrefix: "vue", tour }) });
    remount.mount(container);
    await nextTick();
    assert.equal(container.querySelector("[data-glow-tour-root]")?.id, "vue-root");
    remount.unmount();
  });

  test("releases the prior lease when reactive tour and ID-prefix props change", async () => {
    const [{ createApp, h, nextTick, ref }, runtime] = await Promise.all([
      import("vue"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const first = runtime.createGlowTour();
    const second = runtime.createGlowTour();
    const activeTour = ref(first);
    const prefix = ref("first");
    const app = createApp({
      render: () =>
        h(runtime.GlowTourRoot, {
          idPrefix: prefix.value,
          tour: activeTour.value,
        }),
    });

    app.mount(container);
    await nextTick();
    assert.equal(container.querySelector("[data-glow-tour-root]")?.id, "first-root");

    activeTour.value = second;
    prefix.value = "second";
    await nextTick();
    await nextTick();
    assert.equal(container.querySelector("[data-glow-tour-root]")?.id, "second-root");
    await assert.rejects(() => first.run(first.create("first").finish()), /connected root/i);
    app.unmount();
  });

  test("allocates unique bindings for sibling roots", async () => {
    const [{ createApp, h, nextTick }, runtime] = await Promise.all([
      import("vue"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const left = runtime.createGlowTour();
    const right = runtime.createGlowTour();
    const app = createApp({
      render: () =>
        h("div", [
          h(runtime.GlowTourRoot, { idPrefix: "left", tour: left }),
          h(runtime.GlowTourRoot, { idPrefix: "right", tour: right }),
        ]),
    });

    app.mount(container);
    await nextTick();
    assert.deepEqual(
      Array.from(container.querySelectorAll("[data-glow-tour-root]")).map((root) => root.id),
      ["left-root", "right-root"],
    );
    app.unmount();
  });

  test("keeps nested roots and their delegated next commands isolated", async () => {
    const [{ createApp, h, nextTick }, runtime] = await Promise.all([
      import("vue"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const outerTarget = document.createElement("button");
    const innerTarget = document.createElement("button");
    document.body.append(container, outerTarget, innerTarget);
    const outer = runtime.createGlowTour();
    const inner = runtime.createGlowTour();
    const workflow = (tour: typeof outer, target: HTMLElement, name: string) =>
      tour
        .create(name)
        .step({ content: "One", target, title: "One" })
        .step({ content: "Two", target, title: "Two" })
        .finish();
    const app = createApp({
      render: () =>
        h(runtime.GlowTourRoot, { idPrefix: "outer", tour: outer }, () => [
          h(runtime.GlowTourNextTrigger),
          h(runtime.GlowTourRoot, { idPrefix: "inner", tour: inner }, () => [
            h(runtime.GlowTourNextTrigger),
          ]),
        ]),
    });

    app.mount(container);
    await nextTick();
    await outer.run(workflow(outer, outerTarget, "outer"));
    await inner.run(workflow(inner, innerTarget, "inner"));
    const [outerNext, innerNext] = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-glow-tour-next-trigger]"),
    );
    assert.notEqual(
      outerNext?.getAttribute("aria-controls"),
      innerNext?.getAttribute("aria-controls"),
    );
    innerNext?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(inner.state.get().currentStepIndex, 1);
    assert.equal(outer.state.get().currentStepIndex, 0);
    app.unmount();
  });

  test("delegates dynamic commands while respecting user handlers and disabled controls", async () => {
    const [{ createApp, h, nextTick, ref }, runtime] = await Promise.all([
      import("vue"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = runtime.createGlowTour();
    const workflow = tour
      .create("dynamic controls")
      .step({
        content: "One",
        popover: { keyboardShortcuts: { next: ["N"] } },
        target,
        title: "One",
      })
      .step({ content: "Two", target, title: "Two" })
      .finish();
    const showNext = ref(false);
    const blockNext = ref(true);
    const preventNext = ref(true);
    const app = createApp({
      render: () =>
        h(runtime.GlowTourRoot, { tour }, () => [
          h(runtime.GlowTourCancelTrigger),
          h(runtime.GlowTourBackTrigger),
          showNext.value
            ? h(runtime.GlowTourNextTrigger, {
                disabled: blockNext.value,
                onClick: preventNext.value
                  ? (event: MouseEvent) => event.preventDefault()
                  : undefined,
              })
            : null,
        ]),
    });

    app.mount(container);
    await nextTick();
    await tour.run(workflow);
    const firstBack = container.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
    assert.equal(firstBack?.disabled, true);
    assert.equal(firstBack?.getAttribute("aria-disabled"), "true");
    const cancel = container.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(tour.state.get().status, "cancelled");

    await tour.run(workflow);
    showNext.value = true;
    await nextTick();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const next = container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");
    assert.equal(next?.disabled, true);
    assert.equal(next?.getAttribute("aria-keyshortcuts"), "N");
    next?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(tour.state.get().currentStepIndex, 0);

    blockNext.value = false;
    await nextTick();
    next?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await Promise.resolve();
    assert.equal(tour.state.get().currentStepIndex, 0);

    preventNext.value = false;
    await nextTick();
    next?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(tour.state.get().currentStepIndex, 1);
    const back = container.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
    back?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(tour.state.get().currentStepIndex, 0);

    app.unmount();
  });

  test("renders dynamic step content and visibility through the scoped state subscription", async () => {
    const [{ createApp, h, nextTick }, runtime] = await Promise.all([
      import("vue"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = runtime.createGlowTour();
    const workflow = tour
      .create("dynamic step")
      .step({ content: "Original content", target, title: "Original title" })
      .finish();
    const app = createApp({
      render: () =>
        h(runtime.GlowTourRoot, { tour }, () => [
          h(runtime.GlowTourPopover, null, () => [
            h(runtime.GlowTourHeader),
            h(runtime.GlowTourContent),
            h(runtime.GlowTourFooter, null, () => h(runtime.GlowTourNextTrigger)),
          ]),
        ]),
    });

    app.mount(container);
    await nextTick();
    await tour.run(workflow);
    tour.updateCurrentStep((props) => ({
      ...props,
      content: "Updated content",
      hideFooter: true,
      hideNextButton: true,
      title: "Updated title",
    }));
    await nextTick();
    assert.equal(container.querySelector("[data-glow-tour-header]")?.textContent, "Updated title");
    assert.equal(
      container.querySelector("[data-glow-tour-content]")?.textContent,
      "Updated content",
    );
    assert.equal(container.querySelector("[data-glow-tour-footer]"), null);

    tour.updateCurrentStep((props) => ({ ...props, hideFooter: false, hideNextButton: false }));
    await nextTick();
    assert.equal(
      container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]")?.disabled,
      false,
    );
    app.unmount();
  });

  test("rejects components mounted outside a root context", async () => {
    const [{ createApp, h }, runtime] = await Promise.all([import("vue"), import("./index")]);
    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp({ render: () => h(runtime.GlowTourHeader) });

    const warn = console.warn;
    console.warn = () => {};
    try {
      assert.throws(() => app.mount(container), /rendered inside <GlowTourRoot tour/);
    } finally {
      console.warn = warn;
    }
  });
});
