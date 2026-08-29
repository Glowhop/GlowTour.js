import type { GlowTour as CoreGlowTour } from "@glowhop/core-tour";
import { defineComponent, h, type PropType } from "vue";
import type { VueTourContent } from "../glow-tour";
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

type Tour = CoreGlowTour<VueTourContent>;

export const GlowTourDefault = defineComponent({
  name: "GlowTourDefault",
  props: {
    idPrefix: { type: String },
    tour: { required: true, type: Object as PropType<Tour> },
  },
  setup(props) {
    return () =>
      h(GlowTourRoot, { idPrefix: props.idPrefix, tour: props.tour }, () => [
        h(GlowTourOverlay),
        h(GlowTourPointer),
        h(GlowTourPopover, null, () => [
          h(GlowTourHeader),
          h(GlowTourContent),
          h(GlowTourFooter, null, () => [
            h(GlowTourCancelTrigger),
            h(GlowTourBackTrigger),
            h(GlowTourAdvanceTrigger),
          ]),
        ]),
      ]);
  },
});
