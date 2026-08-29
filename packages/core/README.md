# @glowhop/core-tour

ESM-only workflow engine. Core provides no presentation or framework UI.

```ts
import { createGlowTour } from "@glowhop/core-tour";
const tour = createGlowTour();
const workflow = tour.create("intro").step({ target: "#welcome", title: "Welcome", content: "Hello." }).build();
await tour.run(workflow);
tour.dispose();
```

The factory returns a builder/controller with `run`, `advance`, `previous`, `goToStep`, `cancel`, `dispose`, and readonly `state.get()`/`state.subscribe()`. Steps support static or dynamic targets, placement, interaction, scrolling, callbacks, actions/events, cancellation, and cleanup. `waitUntil` polls every 16 ms by default. A second live root for one instance throws. Adapter authors may use [`@glowhop/core-tour/adapter`](https://github.com/Glowhop/glow-tour/tree/main/packages/core/src/adapter.ts).
