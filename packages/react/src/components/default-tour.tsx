import type { GlowTour as CoreGlowTour } from "@glowhop/core-tour";
import type { ReactTourContent } from "../glow-tour";
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
  readonly tour: CoreGlowTour<ReactTourContent>;
}

export function DefaultTour({ idPrefix, tour }: DefaultTourProps) {
  return (
    <Root idPrefix={idPrefix} tour={tour}>
      <Overlay />
      <Pointer />
      <Popover>
        <Header />
        <Content />
        <Footer>
          <CancelTrigger />
          <BackTrigger />
          <AdvanceTrigger />
        </Footer>
      </Popover>
    </Root>
  );
}
