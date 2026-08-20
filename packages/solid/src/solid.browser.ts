import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

let window: Window;

beforeEach(() => {
  window = new Window();
  Object.assign(globalThis, {
    document: window.document,
    Event: window.Event,
    HTMLElement: window.HTMLElement,
    MouseEvent: window.MouseEvent,
    Node: window.Node,
    SVGSVGElement: window.SVGSVGElement,
    window,
  });
});

afterEach(() => {
  window.close();
});

describe("solid adapter browser behavior", () => {
  test("connects an injected instance and applies one coherent root ID family", async () => {
    const [{ createComponent }, { render }, { createGlowTour, GlowTour }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const tour = createGlowTour();

    const dispose = render(
      () =>
        createComponent(GlowTour.Root, {
          tour,
          get children() {
            return [
              createComponent(GlowTour.Popover, { children: "Popover" }),
              createComponent(GlowTour.Header, {}),
              createComponent(GlowTour.Content, {}),
              createComponent(GlowTour.NextTrigger, {}),
            ];
          },
        }),
      container,
    );

    await Promise.resolve();
    const root = container.querySelector<HTMLElement>("[data-glow-tour-root]");
    const popover = container.querySelector<HTMLElement>("[data-glow-tour-popover]");
    const title = container.querySelector<HTMLElement>("[data-glow-tour-header]");
    const description = container.querySelector<HTMLElement>("[data-glow-tour-content]");
    const next = container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");

    assert.equal(root?.id, "glow-tour-root");
    assert.equal(popover?.id, "glow-tour-popover");
    assert.equal(title?.id, "glow-tour-title");
    assert.equal(description?.id, "glow-tour-description");
    assert.equal(popover?.getAttribute("aria-labelledby"), title?.id);
    assert.equal(popover?.getAttribute("aria-describedby"), description?.id);
    assert.equal(next?.getAttribute("aria-controls"), popover?.id);

    dispose();
    assert.equal(root?.id, "");
  });
});
