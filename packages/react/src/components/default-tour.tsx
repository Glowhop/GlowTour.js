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
  useTour,
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
        <DefaultFooter />
      </GlowTourPopover>
    </GlowTourRoot>
  );
}

/** The footer of the default tour, omitted when every control is hidden. */
function DefaultFooter() {
  const state = useTour();
  const controls = state.currentStep?.currentProps.popover?.controls;
  if (
    controls?.advance === "hidden" &&
    controls.previous === "hidden" &&
    (controls.cancel === "hidden" || !state.canCancel)
  )
    return null;
  return (
    <GlowTourFooter>
      <GlowTourCancelTrigger />
      <GlowTourPreviousTrigger />
      <GlowTourAdvanceTrigger />
    </GlowTourFooter>
  );
}
