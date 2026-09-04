import type { GlowTour as CoreGlowTour, TourState } from "@glowhop/core-tour";
import { type AdapterRootBinding, connectGlowTourRoot } from "@glowhop/core-tour/adapter";
import * as React from "react";
import type { ReactTourContent } from "../glow-tour";
import { DefaultTour } from "./default-tour";

type Tour = CoreGlowTour<ReactTourContent>;
type RootProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "id" | "ref"> & {
  children?: React.ReactNode;
  idPrefix?: string;
  tour: Tour;
};
type ElementProps = Omit<React.HTMLAttributes<HTMLElement>, "id" | "ref"> & {
  as?: React.ElementType;
};
type ContentProps = Omit<React.HTMLAttributes<HTMLElement>, "children" | "id">;
type OverlayProps = Omit<React.SVGAttributes<SVGSVGElement>, "ref">;
/** Content displayed in the pointer indicator for each direction. */
export interface PointerDirectionContent {
  readonly top?: React.ReactNode;
  readonly bottom?: React.ReactNode;
  readonly left?: React.ReactNode;
  readonly right?: React.ReactNode;
}

const DEFAULT_POINTER_DIRECTION_CONTENT: Required<PointerDirectionContent> = {
  bottom: "👇",
  left: "👈",
  right: "👉",
  top: "👆",
};

type PointerProps = Omit<React.HTMLAttributes<HTMLElement>, "aria-hidden" | "children" | "ref"> & {
  as?: React.ElementType;
  directionContent?: PointerDirectionContent;
};
type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> & {
  children?:
    | React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>
    | ((props: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.ReactElement);
};
type BackTriggerProps = ButtonProps & { backLabel?: string };
type AdvanceTriggerProps = ButtonProps & { finishLabel?: string; advanceLabel?: string };
type CancelTriggerProps = ButtonProps;

interface TourContextValue {
  readonly binding: AdapterRootBinding | null;
  readonly tour: Tour;
}

const TourContext = React.createContext<TourContextValue | null>(null);

function useTourContext() {
  const context = React.useContext(TourContext);
  if (!context) {
    throw new Error("GlowTour components must be rendered inside <GlowTour.Root tour={...}>.");
  }
  return context;
}

function useTourSnapshot(tour: Tour): TourState<ReactTourContent> {
  return React.useSyncExternalStore(tour.state.subscribe, tour.state.get, tour.state.get);
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * React 18/19-compatible stand-in for the experimental `React.useEffectEvent`.
 *
 * Keeps the latest `fn` in a ref (updated via a layout effect, so it is current
 * before any effect that reads it can run) and returns a stable callback that
 * always dispatches to that latest closure. The returned function's identity
 * never changes, so it is safe to omit from dependency arrays without causing
 * the effect to see a stale closure or to re-run when `fn` changes identity.
 */
function useEffectEvent<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = React.useRef(fn);
  useIsomorphicLayoutEffect(() => {
    ref.current = fn;
  });
  return React.useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}

function useBoundElement<T extends Element>(
  bind: (binding: AdapterRootBinding, element: T) => () => void,
) {
  const { binding } = useTourContext();
  const [element, setElement] = React.useState<T | null>(null);

  const binder = useEffectEvent(bind);

  React.useEffect(() => {
    if (!binding || !element) return;
    return binder(binding, element);
  }, [binding, element, binder]);

  return setElement;
}

function useStep(snapshot: TourState<ReactTourContent>) {
  return snapshot.currentStep?.currentProps;
}

/**
 * Root component that must wrap all other tour components.
 *
 * Manages tour initialization and connects the tour instance to the DOM.
 * All other tour components (Overlay, Pointer, Popover, etc.) must be rendered inside this root.
 * @param props Component props including the tour instance and optional ID prefix.
 * @returns The root provider component.
 */
export function Root({ children, idPrefix, tour, ...props }: RootProps) {
  const mounted = React.useRef<{ binding: AdapterRootBinding; element: HTMLDivElement } | null>(
    null,
  );
  const [binding, setBinding] = React.useState<AdapterRootBinding | null>(null);

  const release = React.useCallback(() => {
    const current = mounted.current;
    if (!current) return;
    mounted.current = null;
    current.binding.release();
    setBinding((active) => (active === current.binding ? null : active));
  }, []);

  const connect = React.useCallback(
    (element: HTMLDivElement | null) => {
      release();
      if (!element) return;
      const nextBinding = connectGlowTourRoot(tour, {
        idPrefix,
        root: element,
      });
      mounted.current = { binding: nextBinding, element };
      setBinding(nextBinding);
    },
    [idPrefix, release, tour],
  );
  const context = React.useMemo(() => ({ binding, tour }), [binding, tour]);

  return (
    <TourContext.Provider value={context}>
      <div {...props} data-glow-tour-root ref={connect}>
        {children}
      </div>
    </TourContext.Provider>
  );
}

/**
 * The popover container that displays step content.
 *
 * Renders as a `<section>` by default, but can be customized via the `as` prop.
 * Should contain Header, Content, and Footer components.
 * @param props HTML attributes and the `as` prop for customizing the container element.
 * @returns The popover container.
 */
export function Popover({ as: Component = "section", ...props }: ElementProps) {
  const { binding } = useTourContext();
  const ref = useBoundElement<HTMLElement>((activeBinding, element) =>
    activeBinding.bindPopover(element),
  );

  return (
    <Component
      {...props}
      aria-describedby={binding?.ids.description}
      aria-labelledby={binding?.ids.title}
      data-glow-tour-popover
      id={binding?.ids.popover}
      ref={ref}
      role="dialog"
      tabIndex={-1}
    />
  );
}

/**
 * Displays the title of the current step.
 * @param props HTML attributes.
 * @returns The step title header.
 */
export function Header(props: ContentProps) {
  const { binding, tour } = useTourContext();
  const step = useStep(useTourSnapshot(tour));

  return (
    <header {...props} data-glow-tour-header id={binding?.ids.title}>
      {step?.title ?? null}
    </header>
  );
}

/**
 * Displays the body content of the current step.
 * @param props HTML attributes.
 * @returns The step content area.
 */
export function Content(props: ContentProps) {
  const { binding, tour } = useTourContext();
  const step = useStep(useTourSnapshot(tour));

  return (
    <div {...props} aria-live="polite" data-glow-tour-content id={binding?.ids.description}>
      {step?.content ?? null}
    </div>
  );
}

/**
 * The footer section of the popover, typically containing navigation buttons.
 * Automatically hidden if configured via `popover.hideFooter`.
 * @param props HTML attributes and children.
 * @returns The footer container, or null if hidden.
 */
export function Footer({ children, ...props }: ElementProps) {
  const { tour } = useTourContext();
  const step = useStep(useTourSnapshot(tour));
  if (step?.popover?.hideFooter) return null;

  return (
    <footer {...props} data-glow-tour-footer>
      {children}
    </footer>
  );
}

/**
 * The dimmed overlay backdrop that highlights the target element.
 * Renders as an SVG with a cutout around the target.
 * @param props SVG attributes.
 * @returns The overlay SVG element.
 */
export function Overlay({ children, viewBox = "0 0 0 0", ...props }: OverlayProps) {
  const ref = useBoundElement<SVGSVGElement>((binding, element) => binding.bindOverlay(element));

  return (
    <svg
      {...props}
      aria-hidden
      data-glow-tour-overlay
      focusable="false"
      ref={ref}
      role="presentation"
      viewBox={viewBox}
    >
      <path data-glow-tour-overlay-path fillRule="evenodd" />
      {children}
    </svg>
  );
}

/**
 * A pointer/indicator that visually highlights the target element.
 * Displays directional content (emoji or custom content) based on pointer position.
 * Renders as a `<div>` by default, but can be customized via the `as` prop.
 * @param props HTML attributes, the `as` prop for customizing the container, and `directionContent`.
 * @returns The pointer indicator element.
 */
export function Pointer({ as: Component = "div", directionContent, ...props }: PointerProps) {
  const ref = useBoundElement<HTMLElement>((binding, element) => binding.bindPointer(element));
  const content = { ...DEFAULT_POINTER_DIRECTION_CONTENT, ...directionContent };

  return (
    <Component {...props} aria-hidden="true" data-glow-tour-pointer ref={ref}>
      {(Object.keys(DEFAULT_POINTER_DIRECTION_CONTENT) as Array<keyof PointerDirectionContent>).map(
        (direction) => (
          <div data-glow-tour-pointer-direction={direction} key={direction}>
            {content[direction]}
          </div>
        ),
      )}
    </Component>
  );
}

function Trigger({
  children,
  capabilityDisabled,
  label,
  marker,
  onClick,
  disabled: userDisabled,
  ...props
}: ButtonProps & {
  capabilityDisabled: boolean;
  label: string;
  marker: "cancel" | "advance" | "previous";
}) {
  const { binding } = useTourContext();
  const child = typeof children === "function" ? null : children;
  const childProps: React.ButtonHTMLAttributes<HTMLButtonElement> = child?.props ?? {};
  const consumerDisabled = userDisabled === true || childProps.disabled === true;
  const disabled = capabilityDisabled || consumerDisabled;

  const buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    "data-glow-tour-cancel-trigger": true | undefined;
    "data-glow-tour-consumer-disabled": "true" | undefined;
    "data-glow-tour-advance-trigger": true | undefined;
    "data-glow-tour-previous-trigger": true | undefined;
  } = {
    ...props,
    "aria-controls": binding?.ids.popover,
    "aria-label": props["aria-label"] || label,
    "aria-disabled": disabled ? "true" : "false",
    "data-glow-tour-cancel-trigger": marker === "cancel" || undefined,
    "data-glow-tour-consumer-disabled": consumerDisabled ? "true" : undefined,
    "data-glow-tour-advance-trigger": marker === "advance" || undefined,
    "data-glow-tour-previous-trigger": marker === "previous" || undefined,
    disabled,
    onClick: (event) => {
      childProps.onClick?.(event);
      onClick?.(event);
    },
    type: "button",
  };

  if (typeof children === "function") return children(buttonProps);
  if (child) return React.cloneElement(child, buttonProps);
  return <button {...buttonProps}>{label}</button>;
}

/**
 * Button that navigates to the previous step.
 * Automatically hidden or disabled based on tour state.
 * @param props Button props and an optional `backLabel` for the button text.
 * @returns The back button, or null if hidden.
 */
export function BackTrigger({ backLabel, ...props }: BackTriggerProps) {
  const { tour } = useTourContext();
  const snapshot = useTourSnapshot(tour);

  const step = useStep(snapshot);
  if (step?.popover?.hidePreviousButton) return null;
  const label = backLabel ?? "Back step";
  return (
    <Trigger
      {...props}
      capabilityDisabled={!snapshot.canPrevious || step?.popover?.disablePreviousButton === true}
      label={label}
      marker="previous"
    />
  );
}

/**
 * Button that navigates to the next step, or finishes the tour on the last step.
 * Automatically hidden or disabled based on tour state.
 * @param props Button props, an optional `advanceLabel` for non-final steps, and `finishLabel` for the final step.
 * @returns The advance button, or null if hidden.
 */
export function AdvanceTrigger({ finishLabel, advanceLabel, ...props }: AdvanceTriggerProps) {
  const { tour } = useTourContext();
  const snapshot = useTourSnapshot(tour);
  const step = useStep(snapshot);
  if (step?.popover?.hideAdvanceButton) return null;
  const label = snapshot.isLastStep
    ? (finishLabel ?? "Finish tour")
    : (advanceLabel ?? "Advance step");
  return (
    <Trigger
      {...props}
      capabilityDisabled={!snapshot.canAdvance || step?.popover?.disableAdvanceButton === true}
      label={label}
      marker="advance"
    />
  );
}

/**
 * Button that cancels the tour.
 * Automatically hidden if the tour is not cancellable.
 * @param props Button props.
 * @returns The cancel button, or null if the tour cannot be cancelled.
 */
export function CancelTrigger(props: CancelTriggerProps) {
  const { tour } = useTourContext();
  const snapshot = useTourSnapshot(tour);
  if (!snapshot.canCancel) return null;
  return (
    <Trigger {...props} capabilityDisabled={!snapshot.canCancel} label="Skip" marker="cancel" />
  );
}

/**
 * React hook that returns the current tour state.
 *
 * Must be called inside a component rendered within `<GlowTour.Root>`.
 * @returns The current tour state.
 */
export function useTour(): TourState<ReactTourContent> {
  const { tour } = useTourContext();
  return useTourSnapshot(tour);
}

export const GlowTour = {
  Default: DefaultTour,
  Root,
  Popover,
  Header,
  Content,
  Footer,
  Overlay,
  Pointer,
  BackTrigger,
  AdvanceTrigger,
  CancelTrigger,
};
