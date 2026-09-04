import type { GlowTour as CoreGlowTour } from "@glowhop/core-tour";
import { createComponent, type JSX } from "solid-js";
import type { SolidTourContent } from "../glow-tour";
import {
  AdvanceTrigger,
  BackTrigger,
  CancelTrigger,
  Content,
  Footer,
  Header,
  Overlay,
  Pointer,
  Popover,
  Root,
} from "./tour-components";

/** Props for the DefaultTour component. */
export interface DefaultTourProps {
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
export function DefaultTour(props: DefaultTourProps): JSX.Element {
  return createComponent(Root, {
    get idPrefix() {
      return props.idPrefix;
    },
    get tour() {
      return props.tour;
    },
    get children() {
      return [
        createComponent(Overlay, {}),
        createComponent(Pointer, {}),
        createComponent(Popover, {
          get children() {
            return [
              createComponent(Header, {}),
              createComponent(Content, {}),
              createComponent(Footer, {
                get children() {
                  return [
                    createComponent(CancelTrigger, {}),
                    createComponent(BackTrigger, {}),
                    createComponent(AdvanceTrigger, {}),
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
