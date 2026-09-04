// Quick-start snippets copied verbatim from examples/<framework>/src/* so the site never
// diverges from what actually ships and runs in the workspace's example apps.

export const reactSource = `import { createRoot } from "react-dom/client";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, DefaultTour } from "@glowhop/react-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello world!" })
  .build();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <>
      <div style={{ padding: "20px" }}>
        <h1>Glow Tour - React Example</h1>
        <button
          id="welcome"
          type="button"
          onClick={() => void tour.run(workflow)}
          style={{ padding: "10px 20px", fontSize: "16px" }}
        >
          Start tour
        </button>
      </div>
      <DefaultTour tour={tour} />
    </>,
  );
}`;

export const vueSource = `<script setup lang="ts">
import "@glowhop/styles-tour/default.css";
import { createGlowTour, GlowTourDefault } from "@glowhop/vue-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello world!" })
  .build();

function start() {
  void tour.run(workflow);
}
</script>

<template>
  <div style="padding: 20px">
    <h1>Glow Tour - Vue Example</h1>
    <button id="welcome" type="button" @click="start"
      style="padding: 10px 20px; font-size: 16px">
      Start tour
    </button>
  </div>
  <GlowTourDefault :tour="tour" />
</template>`;

export const solidSource = `import { render } from "solid-js/web";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, DefaultTour } from "@glowhop/solid-tour";

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello world!" })
  .build();

const appRoot = document.getElementById("root");
if (appRoot) {
  render(
    () => (
      <>
        <div style={{ padding: "20px" }}>
          <h1>Glow Tour - Solid Example</h1>
          <button
            id="welcome"
            type="button"
            onClick={() => void tour.run(workflow)}
            style={{ padding: "10px 20px", "font-size": "16px" }}
          >
            Start tour
          </button>
        </div>
        <DefaultTour tour={tour} />
      </>
    ),
    appRoot,
  );
}`;

export const angularSource = `import { Component } from "@angular/core";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, GlowTourDefault } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  selector: "app-root",
  template: \`
    <div style="padding: 20px">
      <h1>Glow Tour - Angular Example</h1>
      <button
        id="welcome"
        type="button"
        (click)="start()"
        style="padding: 10px 20px; font-size: 16px"
      >
        Start tour
      </button>
    </div>
    <glow-tour-default [tour]="tour" />
  \`,
})
export class AppComponent {
  readonly tour = createGlowTour();
  readonly workflow = this.tour
    .create("welcome")
    .step({ target: "#welcome", title: "Welcome", content: "Hello world!" })
    .build();

  start() {
    void this.tour.run(this.workflow);
  }
}`;

export const vanillaSource = `import "@glowhop/styles-tour/default.css";
import {
  createDefaultTourElement,
  createGlowTour,
  registerGlowTourElements,
} from "@glowhop/vanilla-tour";

registerGlowTourElements();

const tour = createGlowTour();
const workflow = tour
  .create("welcome")
  .step({ target: "#welcome", title: "Welcome", content: "Hello world!" })
  .build();

const button = document.createElement("button");
button.id = "welcome";
button.type = "button";
button.textContent = "Start tour";
button.addEventListener("click", () => void tour.run(workflow));
document.body.append(button);

const root = createDefaultTourElement(tour);
document.body.append(root);`;
