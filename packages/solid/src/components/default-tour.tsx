import type { GlowTour as CoreGlowTour } from "@glowhop/core-tour";
import { createComponent, type JSX } from "solid-js";
import type { SolidTourContent } from "../glow-tour";
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
  readonly tour: CoreGlowTour<SolidTourContent>;
}

/**
 * A default tour UI component that includes overlay, pointer, popover with header, content, and footer.
 * Provides all standard tour controls (previous, advance, cancel buttons).
 * @param props The component props.
 * @returns The rendered tour UI.
 */
export function GlowTourDefault(props: GlowTourDefaultProps): JSX.Element {
  return createComponent(GlowTourRoot, {
    get idPrefix() {
      return props.idPrefix;
    },
    get tour() {
      return props.tour;
    },
    get children() {
      return [
        createComponent(GlowTourOverlay, {}),
        createComponent(GlowTourPointer, {}),
        createComponent(GlowTourPopover, {
          get children() {
            return [
              createComponent(GlowTourHeader, {}),
              createComponent(GlowTourContent, {}),
              createComponent(GlowTourFooter, {
                get children() {
                  return [
                    createComponent(GlowTourCancelTrigger, {}),
                    createComponent(GlowTourPreviousTrigger, {}),
                    createComponent(GlowTourAdvanceTrigger, {}),
                  ];
                },
              }),
            ];
          },
        }),
      ];
    },
  });
}
