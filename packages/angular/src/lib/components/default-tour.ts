import { Component, Input } from "@angular/core";
import type { GlowTour } from "@glowhop/core-tour";
import type { AngularTourContent } from "../glow-tour";
import {
  GlowTourAdvanceTrigger,
  GlowTourBackTrigger,
  GlowTourCancelTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourRoot,
} from "./tour-components";

@Component({
  selector: "glow-tour-default",
  standalone: true,
  imports: [
    GlowTourRoot,
    GlowTourOverlay,
    GlowTourPointer,
    GlowTourPopover,
    GlowTourHeader,
    GlowTourContent,
    GlowTourFooter,
    GlowTourCancelTrigger,
    GlowTourBackTrigger,
    GlowTourAdvanceTrigger,
  ],
  template: `
    <glow-tour-root [tour]="tour" [idPrefix]="idPrefix">
      <glow-tour-overlay />
      <glow-tour-pointer />
      <glow-tour-popover>
        <glow-tour-header />
        <glow-tour-content />
        <glow-tour-footer>
          <glow-tour-cancel-trigger />
          <glow-tour-back-trigger />
          <glow-tour-advance-trigger />
        </glow-tour-footer>
      </glow-tour-popover>
    </glow-tour-root>
  `,
})
export class GlowTourDefault {
  @Input({ required: true }) tour!: GlowTour<AngularTourContent>;
  @Input() idPrefix?: string;
}
