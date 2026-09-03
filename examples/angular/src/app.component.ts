import { Component } from "@angular/core";
import "@glowhop/styles-tour/default.css";
import { createGlowTour, GlowTourDefault } from "@glowhop/angular-tour";

@Component({
  standalone: true,
  imports: [GlowTourDefault],
  selector: "app-root",
  template: `
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
  `,
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
}
