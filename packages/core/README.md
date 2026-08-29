# @glowhop/core-tour

ESM-only workflow engine. Core has no overlay, popover, or other presentation. Calling `run()` before an adapter mounts a root fails because no root is connected; mounting a root without a popover fails because the required presentation elements are absent. An adapter/default composition must mount first. The adapter-author entry point is [`@glowhop/core-tour/adapter`](https://github.com/Glowhop/glow-tour/blob/main/packages/core/src/adapter.ts).

<!-- glow-tour:snippet core -->
```ts
import { createGlowTour } from "@glowhop/core-tour";

const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
// Pass tour to a mounted adapter/default composition, then call:
// await tour.run(workflow);
```

## Builder and controller

`createGlowTour<T>()` returns a controller. `tour.create(name, options)` returns a builder; call `.step(...)`, then `.build()` to obtain an immutable workflow. Targets may be a selector, an `HTMLElement`, or a resolver `(context) => HTMLElement | null | Promise<HTMLElement | null>`.

| Capability | API | Notes |
| --- | --- | --- |
| Placement | `popover.placementTryOrder`, `indicator.placementTryOrder` | Try `top`, `bottom`, `left`, `right`; the resolved position may be `center`. |
| Interaction | `behavior.allowInteraction` | Allows pointer interaction through the overlay. |
| Scroll | step/start `scroll` | Uses `behavior`, `block`, and `inline` scroll options. |
| Callbacks | `onStart`, `onCancel`, `onFinish`; `beforeAdvance`, `beforePrevious`, `beforeCancel` | Start callbacks are workflow options; transition callbacks are step builder methods. |
| Actions | `.do(fn)`, `.wait(ms)`, `.waitUntil(fn)`, `.waitUntilElement(selector)` | `waitUntil` defaults to a 16 ms interval and 3000 ms timeout. |
| Target events | `.onTargetEvent("click", fn)` | Handlers receive the event and step context. |

`tour.state.get()` returns status, current step, navigation capabilities, and errors; `tour.state.subscribe(listener)` observes changes. The controller exposes `run`, `advance`, `previous`, `goToStep`, and `cancel`. A new run or navigation cancels the previous operation; `dispose()` cancels pending work, releases the root, and makes the controller unusable.
