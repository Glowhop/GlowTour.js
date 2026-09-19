import "@angular/compiler";
import "zone.js";
import { Component, type ElementRef, ViewChild } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { GlowTourDefault, injectGlowTour, injectGlowTourContext } from "@glowhop/angular-tour";
import "@glowhop/styles-tour/default.css";
import "../src/styles.css";
import "../src/theme";
import "../src/tutorial.css";

@Component({
  selector: "use-glow-tour-tutorial",
  standalone: true,
  imports: [GlowTourDefault],
  template: `
    <main class="tutorial">
      <h1>Angular · injectGlowTour</h1>
      <p class="tutorial-lead">State fields are signals.</p>
      <section class="tutorial-status" aria-label="Tour state">
        <output data-testid="tour-status">
          {{ glow.status() }}@if (glow.status() === "active") { · step {{ glow.currentStepIndex() + 1 }} / {{ glow.totalSteps() }}}
        </output>
        <div class="tutorial-actions">
          <button type="button" (click)="start()">
            Start tutorial
          </button>
          <button type="button" [disabled]="!glow.canCancel()" (click)="glow.cancel()">Cancel</button>
        </div>
      </section>
      <div class="tutorial-cards">
        <article class="tutorial-card" data-tour="profile">
          <h2>Profile</h2>
          <p>Name, avatar, and preferences.</p>
          <small>target: '[data-tour="profile"]'</small>
        </article>
        <article class="tutorial-card">
          <h2>Settings</h2>
          <button #saveButton type="button">Save changes</button>
          <small>target: () =&gt; saveButton?.nativeElement</small>
        </article>
        <article class="tutorial-card" data-tour="help">
          <h2>Help</h2>
          <p>Guides and support.</p>
          <small>target: '[data-tour="help"]'</small>
        </article>
      </div>
      <glow-tour-default [tour]="glow.tour" />
    </main>
  `,
})
class UseGlowTourTutorial {
  readonly glow = injectGlowTour();
  // The playground compiles Angular in JIT mode, which supports decorator queries but not viewChild().
  @ViewChild("saveButton") private saveButton?: ElementRef<HTMLButtonElement>;

  private readonly workflow = this.glow
    .create("angular-inject-glow-tour")
    .step({
      id: "profile",
      target: '[data-tour="profile"]',
      title: "Your profile",
      content: "This step targets a data-tour attribute.",
    })
    .step({
      id: "save",
      target: () => this.saveButton?.nativeElement ?? null,
      title: "Save",
      content: "This step targets a @ViewChild query through a function.",
    })
    .step({
      id: "help",
      target: '[data-tour="help"]',
      title: "Help",
      content: "The status bar above updates from injectGlowTour, outside the tour root.",
    })
    .build();

  start() {
    void this.glow.start(this.workflow);
  }
}

class StepCounter {
  readonly glow = injectGlowTourContext();

  get status() {
    return this.glow()?.status;
  }

  get currentStepIndex() {
    return this.glow()?.currentStepIndex;
  }

  get totalSteps() {
    return this.glow()?.totalSteps;
  }
}

bootstrapApplication(UseGlowTourTutorial).catch((error: unknown) => console.error(error));
