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
});
