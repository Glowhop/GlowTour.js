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
type PointerProps = Omit<React.HTMLAttributes<HTMLElement>, "aria-hidden" | "ref"> & {
  as?: React.ElementType;
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

function useBoundElement<T extends Element>(
  bind: (binding: AdapterRootBinding, element: T) => () => void,
) {
  const { binding } = useTourContext();
  const [element, setElement] = React.useState<T | null>(null);

  const binder = React.useEffectEvent(bind);

  React.useEffect(() => {
    if (!binding || !element) return;
    return binder(binding, element);
  }, [binding, element]);

  return setElement;
}

function useStep(snapshot: TourState<ReactTourContent>) {
  return snapshot.currentStep?.currentProps;
}

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

export function Header(props: ContentProps) {
  const { binding, tour } = useTourContext();
  const step = useStep(useTourSnapshot(tour));

  return (
    <header {...props} data-glow-tour-header id={binding?.ids.title}>
      {step?.title ?? null}
    </header>
  );
}

export function Content(props: ContentProps) {
  const { binding, tour } = useTourContext();
  const step = useStep(useTourSnapshot(tour));

  return (
    <div {...props} aria-live="polite" data-glow-tour-content id={binding?.ids.description}>
      {step?.content ?? null}
    </div>
  );
}

export function Footer({ children, ...props }: ElementProps) {
  const { tour } = useTourContext();
  const step = useStep(useTourSnapshot(tour));
  if (step?.hideFooter) return null;

  return (
    <footer {...props} data-glow-tour-footer>
      {children}
    </footer>
  );
}

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

export function Pointer({ as: Component = "div", children, ...props }: PointerProps) {
  const ref = useBoundElement<HTMLElement>((binding, element) => binding.bindPointer(element));

  return (
    <Component {...props} aria-hidden="true" data-glow-tour-pointer ref={ref}>
      <div data-glow-tour-pointer-content>{children}</div>
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

export function BackTrigger({ backLabel, ...props }: BackTriggerProps) {
  const { tour } = useTourContext();
  const snapshot = useTourSnapshot(tour);

  const step = useStep(snapshot);
  if (step?.hidePreviousButton) return null;
  const label = backLabel ?? "Back step";
  return (
    <Trigger
      {...props}
      capabilityDisabled={!snapshot.canPrevious || step?.disablePreviousButton === true}
      label={label}
      marker="previous"
    />
  );
}

export function AdvanceTrigger({ finishLabel, advanceLabel, ...props }: AdvanceTriggerProps) {
  const { tour } = useTourContext();
  const snapshot = useTourSnapshot(tour);
  const step = useStep(snapshot);
  if (step?.hideAdvanceButton) return null;
  const label = snapshot.isLastStep
    ? (finishLabel ?? "Finish tour")
    : (advanceLabel ?? "Advance step");
  return (
    <Trigger
      {...props}
      capabilityDisabled={!snapshot.canAdvance || step?.disableAdvanceButton === true}
      label={label}
      marker="advance"
    />
  );
}

export function CancelTrigger(props: CancelTriggerProps) {
  const { tour } = useTourContext();
  const snapshot = useTourSnapshot(tour);
  if (!snapshot.canCancel) return null;
  return (
    <Trigger {...props} capabilityDisabled={!snapshot.canCancel} label="Skip" marker="cancel" />
  );
}

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
