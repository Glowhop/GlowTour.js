import "@angular/compiler";
import "zone.js";
import { Component, type TemplateRef, ViewChild } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import {
  GlowTourBackTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourNextTrigger,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourRoot,
  glowTour,
} from "@glowhop/angular-tour";
import "@glowhop/styles-tour/default.css";
import "../src/styles.css";

@Component({
  selector: "angular-playground",
  standalone: true,
  imports: [
    GlowTourRoot,
    GlowTourOverlay,
    GlowTourPointer,
    GlowTourPopover,
    GlowTourHeader,
    GlowTourContent,
    GlowTourFooter,
    GlowTourBackTrigger,
    GlowTourNextTrigger,
  ],
  template: `
    <main class="app-screen bg-lime-50/40">
      <a class="back-link inline-flex items-center gap-2 text-emerald-700" href="/">Playground</a>
      <section class="app-panel shadow-sm ring-1 ring-black/5">
        <h1 class="text-3xl font-semibold tracking-tight">Angular app</h1>
        <button class="w-fit" type="button" (click)="startTour()">Start tour</button>
        <span id="angular-tour-id-1" class="target-pill">Step 1</span>
        <span id="angular-tour-id-2" class="target-pill">Step 2</span>
        <button id="angular-tour-id-3" class="target-button target-shrink" type="button">Step 3</button>

        <ng-template #nativeTitle><strong>Angular native TemplateRef</strong></ng-template>

        <glow-tour-root>
          <glow-tour-overlay></glow-tour-overlay>
          <glow-tour-pointer>
            <span data-glow-tour-pointer-content>☝️</span>
          </glow-tour-pointer>
          <glow-tour-popover>
            <glow-tour-header></glow-tour-header>
            <glow-tour-content></glow-tour-content>
            <glow-tour-footer>
              <glow-tour-back-trigger backLabel="Previous step"></glow-tour-back-trigger>
              <glow-tour-next-trigger
                finishLabel="Finish tour"
                nextLabel="Next step"
              ></glow-tour-next-trigger>
            </glow-tour-footer>
          </glow-tour-popover>
        </glow-tour-root>
      </section>
    </main>
  `,
})
class AngularPlayground {
  @ViewChild("nativeTitle", { static: true }) private readonly nativeTitle!: TemplateRef<unknown>;

  startTour() {
    const tour = glowTour
      .create("angular-playground", {
        overlay: { color: "#101820", opacity: 0.58, padding: 10, radius: 8 },
      })
      .step({
        target: "#angular-tour-id-1",
        title: this.nativeTitle,
        content: "This step targets a real Angular-rendered element.",
      })
      .step({
        target: "#angular-tour-id-2",
        title: "Angular overlay override",
        content: "This step uses a red overlay.",
        overlay: { color: "red" },
      })
      .step({
        target: "#angular-tour-id-3",
        title: "Angular interactive target",
        content: "The target remains interactive and receives the pointer.",
        behavior: { allowInteraction: true },
      })
      .finish();
    void glowTour.run(tour);
  }
}

bootstrapApplication(AngularPlayground).catch((error: unknown) => {
  const fallback = document.createElement("pre");
  fallback.className = "app-panel";
  fallback.textContent = error instanceof Error ? error.message : String(error);
  document.body.appendChild(fallback);
  console.error(error);
});
