import type { Tour } from "@glowhop/react-tour";
import { GlowTour } from "@glowhop/react-tour";
import { memo, type ReactNode } from "react";

interface Props {
  tour: Tour<ReactNode>;
}

export const TourRenderer = memo(function TourRenderer({ tour }: Props) {
  return (
    <GlowTour.Root tour={tour}>
      <GlowTour.Overlay />
      <GlowTour.Pointer>☝️</GlowTour.Pointer>
      <GlowTour.Popover>
        <GlowTour.Header />
        <GlowTour.Content />
        <GlowTour.Footer>
          <GlowTour.BackTrigger />
          <GlowTour.NextTrigger />
          <GlowTour.CancelTrigger />
        </GlowTour.Footer>
      </GlowTour.Popover>
    </GlowTour.Root>
  );
});
