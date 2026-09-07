import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import GlowTourElement, { type TourElementStep } from "./base";

class TestElement extends GlowTourElement {
  start(keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions) {
    return this._startAnimation(keyframes, options);
  }

  wait(animation: Animation) {
    return this._waitForAnimation(animation);
  }

  protected _disappear(): Promise<void> {
    return Promise.resolve();
  }

  protected _getNextStyles(_position: DOMRect, _step: TourElementStep): Keyframe {
    return {};
  }

  updatePosition(_nextPosition: DOMRect, _step: TourElementStep): void {}

  initializeProps(): void {}

  protected _release(): void {}
}

function createElement(
  animate?: (
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?: KeyframeAnimationOptions,
  ) => Animation,
) {
  return { animate } as unknown as HTMLElement;
}

function createAnimation(finished: Promise<void>) {
  let cancelled = false;
  return {
    cancel() {
      cancelled = true;
    },
    get cancelled() {
      return cancelled;
    },
    finished,
  } as unknown as Animation;
}

/**
 * A document stand-in whose `visibilityState` can be flipped, mirroring the
 * frozen-timeline behavior a hidden browser tab has.
 */
function createOwnerDocument(visibilityState: DocumentVisibilityState = "visible") {
  const listeners = new Set<() => void>();
  return {
    get listenerCount() {
      return listeners.size;
    },
    visibilityState,
    addEventListener(type: string, listener: () => void) {
      if (type === "visibilitychange") listeners.add(listener);
    },
    removeEventListener(type: string, listener: () => void) {
      if (type === "visibilitychange") listeners.delete(listener);
    },
    hide(this: { visibilityState: DocumentVisibilityState }) {
      this.visibilityState = "hidden";
      for (const listener of listeners) listener();
    },
  };
}

/**
 * An animation that never settles on its own — the way a real one behaves while
 * the document timeline is frozen — and only resolves when `finish()` is called.
 */
function createFrozenAnimation() {
  let resolveFinished!: () => void;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });
  let finishCalls = 0;
  return {
    get finishCalls() {
      return finishCalls;
    },
    cancel() {},
    finish() {
      finishCalls += 1;
      resolveFinished();
    },
    finished,
  } as unknown as Animation & { readonly finishCalls: number };
}

describe("GlowTourElement animation support", () => {
  test("returns a fallback when Web Animations are unavailable", () => {
    const element = new TestElement(createElement());

    assert.equal(element.start([{ opacity: 1 }]), null);
  });

  test("returns a fallback when animation creation throws", () => {
    const element = new TestElement(
      createElement(() => {
        throw new Error("unsupported animation");
      }),
    );

    assert.equal(element.start([{ opacity: 1 }]), null);
  });

  test("does not invoke Web Animations when duration is zero or disabled", () => {
    let calls = 0;
    const animate = () => {
      calls += 1;
      return createAnimation(Promise.resolve());
    };
    const element = new TestElement(createElement(animate));

    element.setAnimationOptions({ duration: 0 });
    assert.equal(element.start([{ opacity: 1 }]), null);
    element.setAnimationOptions({ disabled: true });
    assert.equal(element.start([{ opacity: 1 }]), null);
    assert.equal(calls, 0);
  });

  test("propagates unexpected animation completion failures", async () => {
    const element = new TestElement(createElement());
    const failure = new Error("animation failed");

    await assert.rejects(element.wait(createAnimation(Promise.reject(failure))), failure);
  });

  test("treats internal cancellation as non-fatal", async () => {
    let rejectFinished: (reason: unknown) => void = () => {};
    const animation = createAnimation(
      new Promise<void>((_resolve, reject) => {
        rejectFinished = reject;
      }),
    );
    const element = new TestElement(createElement());
    const waiting = element.wait(animation);

    element.cancelAnimations();
    rejectFinished(new Error("cancelled"));

    assert.equal(await waiting, false);
  });
  test("finishes an animation started while the document is hidden, instead of awaiting a frozen timeline", async () => {
    const owner = createOwnerDocument("hidden");
    const element = new TestElement({
      animate: () => {},
      ownerDocument: owner,
    } as unknown as HTMLElement);
    const animation = createFrozenAnimation();

    // Resolves only because the animation was finished: a hidden document
    // freezes its timeline, so `finished` would never settle on its own.
    assert.equal(await element.wait(animation), true);
    assert.equal(animation.finishCalls, 1);
  });

  test("finishes an in-flight animation when the document becomes hidden", async () => {
    const owner = createOwnerDocument("visible");
    const element = new TestElement({
      animate: () => {},
      ownerDocument: owner,
    } as unknown as HTMLElement);
    const animation = createFrozenAnimation();

    const waiting = element.wait(animation);
    assert.equal(animation.finishCalls, 0);

    owner.hide();

    assert.equal(await waiting, true);
    assert.equal(animation.finishCalls, 1);
  });

  test("removes its visibility listener once the animation settles", async () => {
    const owner = createOwnerDocument("visible");
    const element = new TestElement({
      animate: () => {},
      ownerDocument: owner,
    } as unknown as HTMLElement);
    const animation = createFrozenAnimation();

    const waiting = element.wait(animation);
    assert.equal(owner.listenerCount, 1);

    animation.finish();
    await waiting;

    assert.equal(owner.listenerCount, 0);
  });

  test("leaves a visible document's animation to run on its own timeline", async () => {
    const owner = createOwnerDocument("visible");
    const element = new TestElement({
      animate: () => {},
      ownerDocument: owner,
    } as unknown as HTMLElement);
    const animation = createFrozenAnimation();

    const waiting = element.wait(animation);
    await Promise.resolve();
    assert.equal(animation.finishCalls, 0);

    animation.finish();
    await waiting;
  });
});
