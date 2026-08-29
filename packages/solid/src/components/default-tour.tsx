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

export interface DefaultTourProps {
  readonly idPrefix?: string;
  readonly tour: CoreGlowTour<SolidTourContent>;
}

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
