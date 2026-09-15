import "@glowhop/styles-tour/default.css";
import { ADAPTERS, type AdapterName, type MountFixture } from "./fixture";

const loaders: Record<AdapterName, () => Promise<{ mount: MountFixture }>> = {
  angular: () => import("./adapters/angular"),
  react: () => import("./adapters/react"),
  solid: () => import("./adapters/solid"),
  vanilla: () => import("./adapters/vanilla"),
  vue: () => import("./adapters/vue"),
};

const requested = new URLSearchParams(window.location.search).get("adapter");
const adapter = ADAPTERS.find((name) => name === requested) ?? "vanilla";
const host = document.querySelector<HTMLElement>("#tour-host");
const start = document.querySelector<HTMLButtonElement>("#start-tour");
if (!host || !start) throw new Error("Screen reader fixture markup is missing");

loaders[adapter]()
  .then(({ mount }) => mount(host))
  .then((run) => {
    start.addEventListener("click", () => void run());
    // Tests wait for this marker so they never press keys before the adapter is mounted.
    document.documentElement.dataset.adapter = adapter;
  })
  .catch((error: unknown) => console.error(error));
