import type { GlowTour as CoreGlowTour } from "@glowhop/core-tour";
import type { ReactTourContent } from "../glow-tour";
import {
  GlowTourAdvanceTrigger,
  GlowTourCancelTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourPreviousTrigger,
  GlowTourRoot,
} from "./tour-components";

/** Props for the GlowTourDefault component. */
export interface GlowTourDefaultProps {
  /** Optional prefix for internal element IDs. */
  readonly idPrefix?: string;
  /** The tour controller instance. */
  readonly tour: CoreGlowTour<ReactTourContent>;
}

/**
 * A default tour UI component that includes overlay, pointer, popover with header, content, and footer.
 * Provides all standard tour controls (previous, advance, cancel buttons).
 * @param props The component props.
 * @returns The rendered tour UI.
 */
export function GlowTourDefault({ idPrefix, tour }: GlowTourDefaultProps) {
  return (
    <GlowTourRoot idPrefix={idPrefix} tour={tour}>
      <GlowTourOverlay />
      <GlowTourPointer />
      <GlowTourPopover>
        <GlowTourHeader />
        <GlowTourContent />
        <GlowTourFooter>
          <GlowTourCancelTrigger />
          <GlowTourPreviousTrigger />
          <GlowTourAdvanceTrigger />
        </GlowTourFooter>
      </GlowTourPopover>
    </GlowTourRoot>
  );
}
