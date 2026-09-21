// Framework quick starts follow the primary component-scoped examples from their integration guides.
// Vanilla keeps its standalone example because it has no framework lifecycle hook.

export const reactSource = `import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, useGlowTour } from "@glowhop/react-tour";

export function TourApp() {
  const { tour, create, start, cancel, status, currentStepIndex, totalSteps } = useGlowTour();

  function startTour() {
    const workflow = create("product-tour")
      .step({
        id: "features",
        target: '[data-tour="features"]',
        title: "Explore features",
        content: "Learn about all the capabilities.",
      })
      .step({
        id: "pricing",
        target: '[data-tour="pricing"]',
        title: "Check pricing",
        content: "See plans that fit your needs.",
      })
      .build();
    void start(workflow);
  }

  return (
    <>
      <main>
        <section data-tour="features">
          <h2>Features</h2>
          <p>We offer guided tours, SSR support, and full keyboard navigation.</p>
        </section>
        <section data-tour="pricing">
          <h2>Pricing</h2>
          <p>Open source and free.</p>
        </section>
        {status === "active" ? (
          <p>
            Step {currentStepIndex + 1} of {totalSteps} <button onClick={() => void cancel()}>Stop</button>
          </p>
        ) : (
          <button onClick={startTour}>Start tour</button>
        )}
      </main>
      <GlowTourDefault tour={tour} />
    </>
  );
}`;

export const vueSource = `<script setup lang="ts">
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, useGlowTour } from "@glowhop/vue-tour";

const { tour, create, start, cancel, status, currentStepIndex, totalSteps } = useGlowTour();

const workflow = create("product-tour")
  .step({
    id: "features",
    target: '[data-tour="features"]',
    title: "Explore features",
    content: "Learn about all the capabilities.",
  })
  .step({
    id: "pricing",
    target: '[data-tour="pricing"]',
    title: "Check pricing",
    content: "See plans that fit your needs.",
  })
  .build();
</script>

<template>
  <main>
    <section data-tour="features">
      <h2>Features</h2>
      <p>We offer guided tours, SSR support, and full keyboard navigation.</p>
    </section>
    <section data-tour="pricing">
      <h2>Pricing</h2>
      <p>Open source and free.</p>
    </section>
    <p v-if="status === 'active'">
      Step {{ currentStepIndex + 1 }} of {{ totalSteps }}
      <button @click="cancel()">Stop</button>
    </p>
    <button v-else @click="start(workflow)">Start tour</button>
  </main>
  <GlowTourDefault :tour="tour" />
</template>`;

export const solidSource = `import { Show } from "solid-js";
import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, useGlowTour } from "@glowhop/solid-tour";

function TourApp() {
  const { tour, create, start, cancel, status, currentStepIndex, totalSteps } = useGlowTour();

  const workflow = create("product-tour")
    .step({
      id: "features",
      target: '[data-tour="features"]',
      title: "Explore features",
      content: "Learn about all the capabilities.",
    })
    .step({
      id: "pricing",
      target: '[data-tour="pricing"]',
      title: "Check pricing",
      content: "See plans that fit your needs.",
    })
    .build();

  return (
    <>
      <main>
        <section data-tour="features">
          <h2>Features</h2>
          <p>We offer guided tours, SSR support, and full keyboard navigation.</p>
        </section>
        <section data-tour="pricing">
          <h2>Pricing</h2>
          <p>Open source and free.</p>
        </section>
        <Show
          when={status() === "active"}
          fallback={<button onClick={() => void start(workflow)}>Start tour</button>}
        >
          <p>
            Step {currentStepIndex() + 1} of {totalSteps()} <button onClick={() => void cancel()}>Stop</button>
          </p>
        </Show>
      </main>
      <GlowTourDefault tour={tour} />
    </>
  );
}

render(() => <TourApp />, document.getElementById("app")!);`;

export const angularSource = `import { Component } from "@angular/core";
import "@glowhop/styles-tour/default.css";
import { GlowTourDefault, injectGlowTour } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  template: \`
    <main>
      <section data-tour="features">
        <h2>Features</h2>
        <p>We offer guided tours, SSR support, and full keyboard navigation.</p>
      </section>
      <section data-tour="pricing">
        <h2>Pricing</h2>
        <p>Open source and free.</p>
      </section>
      @if (glow.status() === "active") {
        <p>
          Step {{ glow.currentStepIndex() + 1 }} of {{ glow.totalSteps() }}
          <button (click)="glow.cancel()">Stop</button>
        </p>
      } @else {
        <button (click)="startTour()">Start tour</button>
      }
    </main>
    <glow-tour-default [tour]="glow.tour" />
  \`,
})
export class TourComponent {
  readonly glow = injectGlowTour();

  private readonly workflow = this.glow
    .create("product-tour")
    .step({
      id: "features",
      target: '[data-tour="features"]',
      title: "Explore features",
      content: "Learn about all the capabilities.",
    })
    .step({
      id: "pricing",
      target: '[data-tour="pricing"]',
      title: "Check pricing",
      content: "See plans that fit your needs.",
    })
    .build();

  startTour() {
    void this.glow.start(this.workflow);
  }
}`;

export const vanillaSource = `import "@glowhop/styles-tour/default.css";
import {
  createGlowTour,
  registerGlowTourElements,
} from "@glowhop/vanilla-tour";

registerGlowTourElements();

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ id: "welcome-5", target: "#welcome", title: "Welcome", content: "Hello world!" })
  .build();

const button = document.createElement("button");
button.id = "welcome";
button.type = "button";
button.textContent = "Start tour";
button.addEventListener("click", () => void tour.start(workflow));
document.body.append(button);

const root = document.createElement("glow-tour-default");
root.tour = tour;
document.body.append(root);`;
