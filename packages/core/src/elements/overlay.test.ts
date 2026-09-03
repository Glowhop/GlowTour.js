import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { TourElementStep } from "./base";
import OverlayElement from "./overlay";

class MockPath {
  readonly styles = new Map<string, string>();
  animate?: (
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?: KeyframeAnimationOptions,
  ) => Animation;
  readonly style = {
    getPropertyValue: (name: string) => this.styles.get(name) ?? "",
    removeProperty: (name: string) => this.styles.delete(name),
    setProperty: (name: string, value: string) => this.styles.set(name, value),
  };
}

class MockOverlay {
  readonly attributes = new Map<string, string>();
  readonly styles = new Map<string, string>();
  readonly path = new MockPath();
  readonly style = {
    getPropertyValue: (name: string) => this.styles.get(name) ?? "",
    removeProperty: (name: string) => this.styles.delete(name),
    setProperty: (name: string, value: string) => this.styles.set(name, value),
  };

  querySelector(selector: string) {
    return selector === "path" ? this.path : null;
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

const originalWindow = globalThis.window;

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { devicePixelRatio: 1, innerHeight: 600, innerWidth: 800 },
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

describe("OverlayElement animation fallbacks", () => {
  test("applies final geometry when Web Animations are unavailable", async () => {
    const element = new MockOverlay();
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);
    const step = { overlay: { color: "#111", opacity: 0.5 } } satisfies TourElementStep;

    await overlay.moveToTarget(rect(100, 100, 40, 20), step);

    assert.match(element.path.styles.get("d") ?? "", /^path\("/);
    assert.equal(element.path.styles.get("fill"), "#111");
    assert.equal(element.path.styles.get("opacity"), "0.5");
  });

  test("writes the computed default fill inline when Web Animations are unavailable", async () => {
    const element = new MockOverlay();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        devicePixelRatio: 1,
        getComputedStyle: () => ({ getPropertyValue: () => "rgb(0, 0, 0)" }),
        innerHeight: 600,
        innerWidth: 800,
      },
    });
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});

    assert.equal(element.path.styles.get("fill"), "rgb(0, 0, 0)");
  });

  test("uses an empty fill when the owner realm cannot compute styles", async () => {
    const element = new MockOverlay();
    const ownerDocument = { defaultView: {} };
    Object.defineProperty(element, "ownerDocument", {
      configurable: true,
      value: ownerDocument,
    });
    Object.defineProperty(element.path, "ownerDocument", {
      configurable: true,
      value: ownerDocument,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        devicePixelRatio: 1,
        getComputedStyle: () => ({ getPropertyValue: () => "foreign-fill" }),
        innerHeight: 600,
        innerWidth: 800,
      },
    });
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});

    assert.equal(element.path.styles.get("fill"), "");
  });

  test("does not use a global fill when the owner window is unavailable", async () => {
    const element = new MockOverlay();
    const ownerDocument = { defaultView: null };
    Object.defineProperty(element, "ownerDocument", {
      configurable: true,
      value: ownerDocument,
    });
    Object.defineProperty(element.path, "ownerDocument", {
      configurable: true,
      value: ownerDocument,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        devicePixelRatio: 1,
        getComputedStyle: () => ({ getPropertyValue: () => "foreign-fill" }),
        innerHeight: 600,
        innerWidth: 800,
      },
    });
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});

    assert.equal(element.path.styles.get("fill"), "");
  });

  test("resolves the computed fill after a previous step supplied an explicit color", async () => {
    const element = new MockOverlay();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        devicePixelRatio: 1,
        getComputedStyle: () => ({ getPropertyValue: () => "rgb(0, 0, 0)" }),
        innerHeight: 600,
        innerWidth: 800,
      },
    });
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.moveToTarget(rect(100, 100, 40, 20), { overlay: { color: "red" } });
    await overlay.moveToTarget(rect(200, 200, 40, 20), {});

    assert.equal(element.path.styles.get("fill"), "rgb(0, 0, 0)");
  });

  test("applies the hidden final state when animation creation throws", async () => {
    const element = new MockOverlay();
    element.path.style.setProperty("d", 'path("M0 0")');
    element.path.style.setProperty("fill", "#111");
    element.path.animate = () => {
      throw new Error("unsupported animation");
    };
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.disappear();

    assert.equal(element.path.styles.has("d"), false);
    assert.equal(element.path.styles.has("fill"), false);
    assert.equal(element.path.styles.get("opacity"), "0");
    assert.equal(element.styles.get("pointer-events"), "none");
  });

  test("retargets from computed rendered styles without commitStyles", async () => {
    const element = new MockOverlay();
    const frames: Array<Keyframe[] | PropertyIndexedKeyframes> = [];
    let rejectFirst: (reason: unknown) => void = () => {};
    let stylesAtCancellation: Map<string, string> | undefined;
    element.path.style.setProperty("d", 'path("M0 0")');
    element.path.style.setProperty("fill", "#111");
    element.path.style.setProperty("opacity", "0.7");
    element.path.animate = (keyframes) => {
      frames.push(keyframes);
      if (frames.length === 1) {
        return {
          cancel() {
            stylesAtCancellation = new Map(element.path.styles);
            rejectFirst(new Error("cancelled"));
          },
          finished: new Promise<void>((_resolve, reject) => {
            rejectFirst = reject;
          }),
        } as unknown as Animation;
      }
      return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
    };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        devicePixelRatio: 1,
        getComputedStyle: () => ({
          getPropertyValue: (name: string) =>
            ({ d: 'path("M50 50")', fill: "rgb(17, 17, 17)", opacity: "0.4" })[name] ?? "",
        }),
        innerHeight: 600,
        innerWidth: 800,
      },
    });
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);
    const step = { overlay: { color: "#111" } } satisfies TourElementStep;

    void overlay.animateTo(rect(100, 100, 40, 20), step);
    await Promise.resolve();
    await overlay.animateTo(rect(200, 200, 40, 20), step);

    assert.deepEqual((frames[1] as Keyframe[])[0], {
      d: 'path("M50 50")',
      fill: "rgb(17, 17, 17)",
      opacity: "0.4",
    });
    assert.deepEqual(stylesAtCancellation, new Map(Object.entries((frames[1] as Keyframe[])[0])));
  });

  test("clears a rejected transition before the next animation", async () => {
    const element = new MockOverlay();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        devicePixelRatio: 1,
        getComputedStyle: (path: MockPath) => ({
          getPropertyValue: (name: string) => path.style.getPropertyValue(name),
        }),
        innerHeight: 600,
        innerWidth: 800,
      },
    });
    let animationCalls = 0;
    let cancelCalls = 0;
    let rejectFirst: (reason: unknown) => void = () => {};
    element.path.style.setProperty("d", 'path("M0 0")');
    element.path.style.setProperty("fill", "#111");
    element.path.style.setProperty("opacity", "0.7");
    element.path.animate = () => {
      animationCalls += 1;
      if (animationCalls === 1) {
        return {
          cancel() {
            cancelCalls += 1;
          },
          finished: new Promise<void>((_resolve, reject) => {
            rejectFirst = reject;
          }),
        } as unknown as Animation;
      }
      return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
    };
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);
    const failure = new Error("animation failed");

    const firstAnimation = overlay.animateTo(rect(100, 100, 40, 20), {});
    await Promise.resolve();
    rejectFirst(failure);
    await assert.rejects(
      () => firstAnimation,
      (error) => error === failure,
    );

    await overlay.animateTo(rect(200, 200, 40, 20), {});

    assert.equal(cancelCalls, 0);
  });
});
