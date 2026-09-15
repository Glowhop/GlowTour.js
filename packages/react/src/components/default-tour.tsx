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
  useTour,
} from "./tour-components";

/** Props for the DefaultTour component. */
export interface DefaultTourProps {
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
export function DefaultTour({ idPrefix, tour }: DefaultTourProps) {
  return (
    <Root idPrefix={idPrefix} tour={tour}>
      <Overlay />
      <Pointer />
      <Popover>
        <Header />
        <Content />
        <DefaultFooter />
      </Popover>
    </Root>
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
    <Footer>
      <CancelTrigger />
      <BackTrigger />
      <AdvanceTrigger />
    </Footer>
  );
}
