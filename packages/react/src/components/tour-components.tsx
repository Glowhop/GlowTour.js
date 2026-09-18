import type {
  ClassValue,
  GlowTour as CoreGlowTour,
  TourClassNames,
  TourState,
} from "@glowhop/core-tour";
import {
  type AdapterRootBinding,
  connectGlowTourRoot,
  OVERLAY_IDLE_ATTRIBUTES,
  OVERLAY_IDLE_STYLE,
  OVERLAY_PATH_IDLE_ATTRIBUTES,
  POINTER_IDLE_STYLE,
  POPOVER_IDLE_ATTRIBUTES,
  POPOVER_IDLE_STYLE,
  styleRecordToCamelCase,
} from "@glowhop/core-tour/adapter";
import * as React from "react";
import type { ReactTourContent } from "../glow-tour";

type Tour = CoreGlowTour<ReactTourContent>;
type RootProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "id" | "ref"> & {
  children?: React.ReactNode;
  idPrefix?: string;
  tour: Tour;
};
type ElementProps = Omit<React.HTMLAttributes<HTMLElement>, "id" | "ref">;
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

const OVERLAY_IDLE_STYLE_REACT = styleRecordToCamelCase(OVERLAY_IDLE_STYLE) as React.CSSProperties;
const POINTER_IDLE_STYLE_REACT = styleRecordToCamelCase(POINTER_IDLE_STYLE) as React.CSSProperties;
const POPOVER_IDLE_STYLE_REACT = styleRecordToCamelCase(POPOVER_IDLE_STYLE) as React.CSSProperties;

type PointerProps = Omit<React.HTMLAttributes<HTMLElement>, "aria-hidden" | "children" | "ref"> & {
  directionContent?: PointerDirectionContent;
};
type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> & {
  children?:
    | React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>
    | ((props: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.ReactElement);
};
type PreviousTriggerProps = ButtonProps & { previousLabel?: string };
type AdvanceTriggerProps = ButtonProps & { finishLabel?: string; advanceLabel?: string };
type CancelTriggerProps = ButtonProps;

interface TourContextValue {
  readonly binding: AdapterRootBinding | null;
  readonly tour: Tour;
}

const TourContext = React.createContext<TourContextValue | null>(null);

function useTourScope() {
  const context = React.useContext(TourContext);
  if (!context) {
    throw new Error("GlowTour components must be rendered inside <GlowTourRoot tour={...}>.");
  }
  return context;
}

/** @internal Subscribes to a tour's state, shared with `useGlowTour`. */
export function useTourSnapshot(tour: Tour): TourState<ReactTourContent> {
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
  const { binding } = useTourScope();
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

/** Joins the component's own classes with the ones the current step adds to it. */
function joinClassNames(...values: (ClassValue | undefined)[]) {
  return values.flat().filter(Boolean).join(" ") || undefined;
}

/** The component's `className` followed by the current step's `classNames[slot]`. */
function useStepClassName(slot: keyof TourClassNames, className: string | undefined) {
  const { tour } = useTourScope();
  return joinClassNames(className, useStep(useTourSnapshot(tour))?.classNames?.[slot]);
}

/**
 * Root component that must wrap all other tour components.
 *
 * Manages tour initialization and connects the tour instance to the DOM.
 * All other tour components (GlowTourOverlay, GlowTourPointer, GlowTourPopover, etc.) must be rendered inside this root.
 * @param props Component props including the tour instance and optional ID prefix.
 * @returns The root provider component.
 */
export function GlowTourRoot({ children, idPrefix, tour, ...props }: RootProps) {
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
 * Renders as a `<section>`.
 * Should contain GlowTourHeader, GlowTourContent, and GlowTourFooter components.
 * @param props HTML attributes and children.
 * @returns The popover container.
 */
export function GlowTourPopover({ className, style, ...props }: ElementProps) {
  const { binding, tour } = useTourScope();
  const step = useStep(useTourSnapshot(tour));
  // Without a title, the content names the dialog instead of describing it.
  const titled = !step || step.title != null;
  const ref = useBoundElement<HTMLElement>((activeBinding, element) =>
    activeBinding.bindPopover(element),
  );

  return (
    <section
      {...props}
      aria-describedby={titled ? binding?.ids.description : undefined}
      aria-hidden={POPOVER_IDLE_ATTRIBUTES["aria-hidden"]}
      aria-labelledby={titled ? binding?.ids.title : binding?.ids.description}
      className={joinClassNames(className, step?.classNames?.popover)}
      data-glow-tour-popover
      id={binding?.ids.popover}
      inert={POPOVER_IDLE_ATTRIBUTES.inert === "true"}
      ref={ref}
      role="dialog"
      style={style ?? POPOVER_IDLE_STYLE_REACT}
      tabIndex={-1}
    />
  );
}

/**
 * Displays the title of the current step.
 * @param props HTML attributes.
 * @returns The step title header.
 */
export function GlowTourHeader({ className, ...props }: ContentProps) {
  const { binding, tour } = useTourScope();
  const step = useStep(useTourSnapshot(tour));
  if (step && step.title == null) return null;

  return (
    <header
      {...props}
      className={joinClassNames(className, step?.classNames?.header)}
      data-glow-tour-header
      id={binding?.ids.title}
    >
      {step?.title ?? null}
    </header>
  );
}

/**
 * Displays the body content of the current step.
 * @param props HTML attributes.
 * @returns The step content area.
 */
export function GlowTourContent({ className, ...props }: ContentProps) {
  const { binding, tour } = useTourScope();
  const step = useStep(useTourSnapshot(tour));

  return (
    <div
      {...props}
      aria-live="polite"
      className={joinClassNames(className, step?.classNames?.content)}
      data-glow-tour-content
      id={binding?.ids.description}
    >
      {step?.content ?? null}
    </div>
  );
}

/**
 * The footer section of the popover, typically containing navigation buttons.
 * @param props HTML attributes and children.
 * @returns The footer container.
 */
export function GlowTourFooter({ children, className, ...props }: ElementProps) {
  return (
    <footer {...props} className={useStepClassName("footer", className)} data-glow-tour-footer>
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
// `inert` is a global HTML attribute; @types/react's `SVGAttributes` does not
// declare it even though browsers honor it on `<svg>`, so it is applied via a
// separately typed prop bag rather than as a named `SVGProps` prop.
const OVERLAY_INERT_PROP: { inert?: boolean } = {
  inert: OVERLAY_IDLE_ATTRIBUTES.inert === "true",
};

export function GlowTourOverlay({
  children,
  className,
  style,
  viewBox = "0 0 0 0",
  ...props
}: OverlayProps) {
  const stepClassName = useStepClassName("overlay", className);
  const ref = useBoundElement<SVGSVGElement>((binding, element) => binding.bindOverlay(element));

  return (
    <svg
      {...props}
      {...OVERLAY_INERT_PROP}
      aria-hidden={OVERLAY_IDLE_ATTRIBUTES["aria-hidden"]}
      className={stepClassName}
      data-glow-tour-allow-interaction={OVERLAY_IDLE_ATTRIBUTES["data-glow-tour-allow-interaction"]}
      data-glow-tour-overlay
      focusable="false"
      preserveAspectRatio={OVERLAY_IDLE_ATTRIBUTES.preserveAspectRatio}
      ref={ref}
      role="presentation"
      style={style ?? OVERLAY_IDLE_STYLE_REACT}
      viewBox={viewBox}
    >
      <path
        cursor={OVERLAY_PATH_IDLE_ATTRIBUTES.cursor}
        data-glow-tour-overlay-path
        fillRule="evenodd"
        opacity={OVERLAY_PATH_IDLE_ATTRIBUTES.opacity}
        pointerEvents={OVERLAY_PATH_IDLE_ATTRIBUTES["pointer-events"]}
      />
      {children}
    </svg>
  );
}

/**
 * A pointer/indicator that visually highlights the target element.
 * Displays directional content (emoji or custom content) based on pointer position.
 * Renders as a `<div>`.
 * @param props HTML attributes and `directionContent`.
 * @returns The pointer indicator element.
 */
export function GlowTourPointer({ className, directionContent, style, ...props }: PointerProps) {
  const stepClassName = useStepClassName("pointer", className);
  const ref = useBoundElement<HTMLElement>((binding, element) => binding.bindPointer(element));
  const content = { ...DEFAULT_POINTER_DIRECTION_CONTENT, ...directionContent };

  return (
    <div
      {...props}
      aria-hidden="true"
      className={stepClassName}
      data-glow-tour-pointer
      ref={ref}
      style={style ?? POINTER_IDLE_STYLE_REACT}
    >
      {(Object.keys(DEFAULT_POINTER_DIRECTION_CONTENT) as Array<keyof PointerDirectionContent>).map(
        (direction) => (
          <div data-glow-tour-pointer-direction={direction} key={direction}>
            {content[direction]}
          </div>
        ),
      )}
    </div>
  );
}

function Trigger({
  children,
  capabilityDisabled,
  className,
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
  const { binding } = useTourScope();
  const child = typeof children === "function" ? null : children;
  const childProps: React.ButtonHTMLAttributes<HTMLButtonElement> = child?.props ?? {};
  const stepClassName = useStepClassName(marker, className ?? childProps.className);
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
    className: stepClassName,
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
 * Automatically disabled based on tour state.
 * @param props Button props and an optional `previousLabel` for the button text.
 * @returns The back button.
 */
export function GlowTourPreviousTrigger({ previousLabel, ...props }: PreviousTriggerProps) {
  const { tour } = useTourScope();
  const snapshot = useTourSnapshot(tour);

  const step = useStep(snapshot);
  const control = step?.controls?.previous?.state;
  const label = previousLabel ?? "Previous step";
  return (
    <Trigger
      {...props}
      capabilityDisabled={
        (snapshot.status !== "transitioning" && !snapshot.canPrevious) || control === "disabled"
      }
      label={label}
      marker="previous"
    />
  );
}

/**
 * Button that navigates to the next step, or finishes the tour on the last step.
 * Automatically disabled based on tour state.
 * @param props Button props, an optional `advanceLabel` for non-final steps, and `finishLabel` for the final step.
 * @returns The advance button.
 */
export function GlowTourAdvanceTrigger({
  finishLabel,
  advanceLabel,
  ...props
}: AdvanceTriggerProps) {
  const { tour } = useTourScope();
  const snapshot = useTourSnapshot(tour);
  const step = useStep(snapshot);
  const control = step?.controls?.advance?.state;
  const label = snapshot.isLastStep
    ? (finishLabel ?? "Finish tour")
    : (advanceLabel ?? "Advance step");
  return (
    <Trigger
      {...props}
      capabilityDisabled={
        (snapshot.status !== "transitioning" && !snapshot.canAdvance) || control === "disabled"
      }
      label={label}
      marker="advance"
    />
  );
}

/**
 * Button that cancels the tour.
 * Automatically disabled based on tour state.
 * @param props Button props.
 * @returns The cancel button.
 */
export function GlowTourCancelTrigger(props: CancelTriggerProps) {
  const { tour } = useTourScope();
  const snapshot = useTourSnapshot(tour);
  const control = useStep(snapshot)?.controls?.cancel?.state;
  return (
    <Trigger
      {...props}
      capabilityDisabled={
        (snapshot.status !== "transitioning" && !snapshot.canCancel) || control === "disabled"
      }
      label="Skip"
      marker="cancel"
    />
  );
}

/**
 * Reads the state of the tour rendered by the enclosing `<GlowTourRoot>`.
 *
 * Use it to build tour UI inside the root; use `useGlowTour` to run a tour from a component.
 * @returns The current tour state.
 */
export function useGlowTourContext(): TourState<ReactTourContent> {
  const { tour } = useTourScope();
  return useTourSnapshot(tour);
}
