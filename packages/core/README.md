# @glowhop/core-tour

ESM-only, framework-agnostic workflow controller and DOM driver. Core owns workflow state, navigation, target resolution, and DOM-level tour behavior; adapters provide component rendering and composition. Connecting a root succeeds without a popover; running a non-empty workflow fails if the root or popover is missing. The adapter-author entry point is [`@glowhop/core-tour/adapter`](https://github.com/Glowhop/glow-tour/blob/main/packages/core/src/adapter.ts).

Compatibility: framework-independent ESM package. Core provides no SSR-rendered UI; hydration is not applicable to Core itself.

<!-- glow-tour:snippet core-workflow -->
```ts
import { createGlowTour } from "@glowhop/core-tour";

const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
// Pass tour to a mounted adapter/default composition, then call:
// await tour.run(workflow);
```

## Builder and controller

`createGlowTour<T>(options?: GlowTourOptions)` returns a controller. `tour.create(name, options)` returns a builder; call `.step(...)`, then `.build()` to obtain an immutable workflow. Targets may be a selector, an `HTMLElement`, or a resolver `(context) => HTMLElement | null | Promise<HTMLElement | null>`.

| Capability | API | Notes |
| --- | --- | --- |
| Placement | `popover.placementTryOrder`, `indicator.placementTryOrder` | Try `top`, `bottom`, `left`, `right`; the resolved position may be `center`. |
| Interaction | `behavior.allowInteraction` | Allows pointer interaction through the overlay. |
| Scroll | step/start `scroll` | Uses `behavior`, `block`, and `inline` scroll options. |
| Callbacks | `onStart`, `onCancel`, `onFinish`; `beforeAdvance`, `beforePrevious`, `beforeCancel` | Start callbacks are workflow options; transition callbacks are step builder methods. |
| Actions | `.do(fn)`, `.wait(ms)`, `.waitUntil(fn)`, `.waitUntilElement(selector)` | `waitUntil` defaults to a 16 ms interval and 3000 ms timeout. |
| Target events | `.onTargetEvent("click", fn)` | Handlers receive the event and step context. |

`tour.state.get()` returns status, current step, navigation capabilities, and errors; `tour.state.subscribe(listener)` observes changes. The controller exposes `run`, `advance`, `previous`, `goToStep`, and `cancel`. A new run or navigation cancels the previous operation; `dispose()` cancels pending work, releases the root, and makes the controller unusable.

## Errors and rendering fallbacks

Pass `onSubscriberError(error)` in `GlowTourOptions` to observe failures from state and step-props subscribers:

```ts
import { createGlowTour } from "@glowhop/core-tour";

const tour = createGlowTour({
  onSubscriberError(error) {
    console.error("Tour subscriber failed", error);
  },
});
```

Subscriber failures are isolated and normalized to `Error`; they do not fail the tour transition. If `onSubscriberError` throws or returns a rejected promise, that failure is reported asynchronously outside the transition.

Web Animations are optional. When the capability is missing or unsupported, Core applies the final DOM state immediately and continues without animation.

A failure from a mounted rendering layer is fatal: the command rejects, and the next published state has `status === "error"` with the failure in `state.error`. Core does not publish `active` for the failed step.
