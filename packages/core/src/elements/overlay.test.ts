import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { TourElementStep } from "./base";
import OverlayElement from "./overlay";

class MockPath {
  readonly attributes = new Map<string, string>();
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

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
}

class MockOverlay {
  readonly attributes = new Map<string, string>();
  readonly styles = new Map<string, string>();
  readonly path = new MockPath();
  /** Zero by default, which is how an unlaid-out element measures. */
  box = { height: 0, width: 0 };

  getBoundingClientRect() {
    return this.box;
  }
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

/** Chromium-like: the CSS `d` property exists, so the cutout can morph. */
const cssSupportingPathD = { supports: () => true };

const originalWindow = globalThis.window;

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { CSS: cssSupportingPathD, devicePixelRatio: 1, innerHeight: 600, innerWidth: 800 },
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
        CSS: cssSupportingPathD,
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
        CSS: cssSupportingPathD,
        devicePixelRatio: 1,
        getComputedStyle: () => ({ getPropertyValue: () => "foreign-fill" }),
        innerHeight: 600,
        innerWidth: 800,
      },
    });
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});

    assert.equal(element.path.styles.get("fill") ?? "", "");
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
        CSS: cssSupportingPathD,
        devicePixelRatio: 1,
        getComputedStyle: () => ({ getPropertyValue: () => "foreign-fill" }),
        innerHeight: 600,
        innerWidth: 800,
      },
    });
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});

    assert.equal(element.path.styles.get("fill") ?? "", "");
  });

  test("resolves the computed fill after a previous step supplied an explicit color", async () => {
    const element = new MockOverlay();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        CSS: cssSupportingPathD,
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
        CSS: cssSupportingPathD,
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
        CSS: cssSupportingPathD,
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

describe("OverlayElement on engines without the CSS `d` property", () => {
  /**
   * WebKit — and therefore every browser on iOS, Chrome included — does not
   * implement the CSS `d` property: an inline `d: path(...)` is dropped and the
   * backdrop never draws. The geometry has to reach the `d` attribute instead.
   */
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        CSS: { supports: () => false },
        devicePixelRatio: 1,
        innerHeight: 600,
        innerWidth: 800,
      },
    });
  });

  test("writes the cutout to the `d` attribute", async () => {
    const element = new MockOverlay();
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});

    assert.match(element.path.attributes.get("d") ?? "", /^M0,0 H800 V600 H0 Z/);
    assert.equal(element.path.attributes.get("d")?.includes("path("), false);
  });

  test("commits the geometry up front and animates the rest", async () => {
    const element = new MockOverlay();
    const frames: (Keyframe[] | PropertyIndexedKeyframes)[] = [];
    element.path.animate = (keyframes) => {
      frames.push(keyframes);
      return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
    };
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});
    const firstCutout = element.path.attributes.get("d");
    await overlay.moveToTarget(rect(200, 200, 40, 20), {});

    assert.notEqual(element.path.attributes.get("d"), firstCutout);
    assert.match(element.path.attributes.get("d") ?? "", /M192,200 /);
    for (const keyframe of frames.flat() as Keyframe[]) {
      assert.equal("d" in keyframe, false);
    }
  });

  test("clears the attribute when the overlay is released", async () => {
    const element = new MockOverlay();
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});
    assert.ok(element.path.attributes.has("d"));

    overlay.release();

    assert.equal(element.path.attributes.has("d"), false);
  });
});

/**
 * A frame scheduler the tests drive by hand, standing in for the browser's.
 * `run(timestamp)` plays back every frame queued so far at that timestamp.
 */
function frameScheduler() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  const cancelled: number[] = [];

  return {
    cancelled,
    cancelAnimationFrame(id: number) {
      cancelled.push(id);
      pending.delete(id);
    },
    get pendingCount() {
      return pending.size;
    },
    requestAnimationFrame(callback: FrameRequestCallback) {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    run(timestamp: number) {
      const frames = [...pending.entries()];
      pending.clear();
      for (const [, callback] of frames) callback(timestamp);
    },
  };
}

/** An animation that is over before the caller can await it. */
function settledAnimation() {
  return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
}

/** Resolves only once the caller explicitly finishes it. */
function pendingAnimation() {
  let settle = () => {};
  const finished = new Promise<void>((resolve) => {
    settle = resolve;
  });
  return {
    animation: { cancel: () => settle(), finished } as unknown as Animation,
    finish: () => settle(),
  };
}

describe("OverlayElement cutout tween on engines without the CSS `d` property", () => {
  /**
   * WebKit cannot animate `d` at all, as a CSS property or as a WAAPI value,
   * so the cutout has to be walked to its target by hand — one interpolated
   * `d` attribute per frame, the way driver.js moves its stage. Without it the
   * highlight teleports between steps on every browser on iOS.
   */
  function setupWebKit(frames: ReturnType<typeof frameScheduler>) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        CSS: { supports: () => false },
        cancelAnimationFrame: frames.cancelAnimationFrame,
        devicePixelRatio: 1,
        innerHeight: 600,
        innerWidth: 800,
        requestAnimationFrame: frames.requestAnimationFrame,
      },
    });
  }

  test("walks the cutout to its target instead of snapping", async () => {
    const frames = frameScheduler();
    setupWebKit(frames);
    const element = new MockOverlay();
    element.path.animate = settledAnimation;
    const overlay = new OverlayElement(element as unknown as SVGSVGElement, {
      duration: 100,
      easing: "linear",
    });

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});
    const start = element.path.attributes.get("d");
    assert.match(start ?? "", /Z M92,100 /);

    const { animation, finish } = pendingAnimation();
    element.path.animate = () => animation;
    const move = overlay.moveToTarget(rect(300, 100, 40, 20), {});
    frames.run(0);
    // The tween owns the geometry now, so the shape must not have jumped to the
    // destination the moment the animation started.
    assert.equal(element.path.attributes.get("d"), start);

    frames.run(50);
    assert.match(element.path.attributes.get("d") ?? "", /Z M192,100 /);

    frames.run(100);
    assert.match(element.path.attributes.get("d") ?? "", /Z M292,100 /);
    assert.equal(frames.pendingCount, 0);

    finish();
    await move;
    assert.match(element.path.attributes.get("d") ?? "", /Z M292,100 /);
  });

  test("keeps the geometry out of the keyframes it hands to the engine", async () => {
    const frames = frameScheduler();
    setupWebKit(frames);
    const element = new MockOverlay();
    const keyframes: (Keyframe[] | PropertyIndexedKeyframes)[] = [];
    element.path.animate = (frame) => {
      keyframes.push(frame);
      return settledAnimation();
    };
    const overlay = new OverlayElement(element as unknown as SVGSVGElement, { duration: 100 });

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});
    await overlay.moveToTarget(rect(300, 100, 40, 20), {});

    for (const keyframe of keyframes.flat() as Keyframe[]) assert.equal("d" in keyframe, false);
  });

  test("commits the target shape when there is no frame scheduler to tween with", async () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { CSS: { supports: () => false }, devicePixelRatio: 1 },
    });
    const element = new MockOverlay();
    element.path.animate = settledAnimation;
    const overlay = new OverlayElement(element as unknown as SVGSVGElement, { duration: 100 });

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});
    await overlay.moveToTarget(rect(300, 100, 40, 20), {});

    assert.match(element.path.attributes.get("d") ?? "", /Z M292,100 /);
  });

  test("drops the tween when the overlay is released mid-flight", async () => {
    const frames = frameScheduler();
    setupWebKit(frames);
    const element = new MockOverlay();
    element.path.animate = settledAnimation;
    const overlay = new OverlayElement(element as unknown as SVGSVGElement, {
      duration: 100,
      easing: "linear",
    });

    await overlay.moveToTarget(rect(100, 100, 40, 20), {});
    const { animation } = pendingAnimation();
    element.path.animate = () => animation;
    void overlay.moveToTarget(rect(300, 100, 40, 20), {});
    frames.run(0);
    assert.ok(frames.pendingCount > 0);

    overlay.release();

    assert.ok(frames.cancelled.length > 0);
    assert.equal(element.path.attributes.has("d"), false);
    frames.run(50);
    assert.equal(element.path.attributes.has("d"), false);
  });
});

describe("OverlayElement viewBox", () => {
  test("tracks the box the overlay is actually painted into", () => {
    const element = new MockOverlay();
    element.box = { height: 844, width: 390 };
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    overlay.initializeProps();

    // Not `innerHeight` (600) — a mobile URL bar moves the two apart, and a
    // viewBox that disagrees with the element's box letterboxes the backdrop.
    assert.equal(element.attributes.get("viewBox"), "0 0 390 844");
    assert.equal(element.attributes.get("preserveAspectRatio"), "xMinYMin slice");
  });

  test("resyncs the viewBox when the box changes under it", () => {
    const element = new MockOverlay();
    element.box = { height: 844, width: 390 };
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    overlay.initializeProps();
    element.box = { height: 750, width: 390 };
    overlay.updatePosition(rect(100, 100, 40, 20), {});

    assert.equal(element.attributes.get("viewBox"), "0 0 390 750");
  });

  test("spans the largest viewport where the unit is understood", () => {
    const element = new MockOverlay();
    const overlay = new OverlayElement(element as unknown as SVGSVGElement);

    overlay.initializeProps();

    assert.equal(element.styles.get("height"), "100lvh");
  });
});
