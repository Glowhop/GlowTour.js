import type { WorkflowStep } from "@glowhop/core-tour";
import { Observable } from "@glowhop/observables";
import { useValue } from "@glowhop/react-observables";
import * as React from "react";
import { glowTour } from "../glow-tour";

type ElementProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
};
type ContentProps = Omit<React.HTMLAttributes<HTMLElement>, "children">;
type OverlayProps = Omit<React.SVGAttributes<SVGSVGElement>, "ref">;
type PointerProps = Omit<React.HTMLAttributes<HTMLElement>, "aria-hidden"> & {
  as?: React.ElementType;
};
type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> & {
  children?:
    | React.ReactElement
    | ((props: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.ReactElement);
};
type BackTriggerProps = ButtonProps & { backLabel?: string };
type NextTriggerProps = ButtonProps & { finishLabel?: string; nextLabel?: string };

const POPOVER_ID = "glow-tour-popover";
const TITLE_ID = "glow-tour-title";
const DESCRIPTION_ID = "glow-tour-description";

export function Root({ children }: { children: React.ReactNode }) {
  return children;
}

export function Popover({
  children,
  "aria-describedby": ariaDescribedby = DESCRIPTION_ID,
  "aria-labelledby": ariaLabelledby = TITLE_ID,
  id = POPOVER_ID,
  role = "dialog",
  as: Component = "section",
  ...props
}: ElementProps) {
  return (
    <Component
      {...props}
      aria-describedby={ariaDescribedby}
      aria-labelledby={ariaLabelledby}
      data-glow-tour-popover
      id={id}
      ref={(element: unknown) => {
        glowTour.state.registerElementPopover(element instanceof HTMLElement ? element : null);
      }}
      tabIndex={-1}
      role={role}
    >
      {children}
    </Component>
  );
}

export function Header({ id = TITLE_ID, ...props }: ContentProps) {
  const stepProps = useGlowTourStepProps();
  const title = useValue(stepProps, (state) => {
    return state.title ?? null;
  });

  return (
    <header {...props} data-glow-tour-header id={id}>
      {title}
    </header>
  );
}

export function Content({
  "aria-live": ariaLive = "polite",
  id = DESCRIPTION_ID,
  ...props
}: ContentProps) {
  const stepProps = useGlowTourStepProps();
  const content = useValue(stepProps, (state) => {
    return state.content ?? null;
  });

  return (
    <div {...props} aria-live={ariaLive} data-glow-tour-content id={id}>
      {content}
    </div>
  );
}

export function Footer({ children, ...props }: ElementProps) {
  const stepProps = useGlowTourStepProps();
  const isHidden = useValue(stepProps, (state) => {
    return state.hideFooter;
  });

  if (isHidden) {
    return null;
  }

  return (
    <footer {...props} data-glow-tour-footer>
      {children}
    </footer>
  );
}

export function Overlay({
  children,
  "aria-hidden": ariaHidden = true,
  viewBox = "0 0 0 0",
  ...props
}: OverlayProps) {
  return (
    <svg
      {...props}
      aria-hidden={ariaHidden}
      data-glow-tour-overlay
      focusable="false"
      ref={(element) => {
        glowTour.state.registerElementOverlay(element);
      }}
      role="presentation"
      viewBox={viewBox}
    >
      <path data-glow-tour-overlay-path fillRule="evenodd" />
      {children}
    </svg>
  );
}

export function Pointer({ as: Component = "div", children, ...props }: PointerProps) {
  return (
    <Component
      {...props}
      aria-hidden="true"
      data-glow-tour-pointer
      ref={(element: unknown) => {
        glowTour.state.registerElementPointer(element instanceof HTMLElement ? element : null);
      }}
    >
      {children}
    </Component>
  );
}

export function BackTrigger({
  children,
  backLabel,
  "aria-controls": ariaControls = POPOVER_ID,
  "aria-label": ariaLabel,
  ...props
}: BackTriggerProps) {
  const isDisabled = useValue(glowTour.state.snapshot, (state) => {
    return state.canGoBack === false;
  });

  const stepProps = useGlowTourStepProps();

  const isStepDisabled = useValue(stepProps, (state) => {
    return state.disableBackButton;
  });

  const isFirstStep = useValue(glowTour.state.snapshot, (state) => {
    return state.isFirstStep;
  });

  const isHidden = useValue(stepProps, (state) => {
    return state.hideBackButton;
  });

  const configuredLabel = useValue(glowTour.state.snapshot, (state) => {
    return state.startOptions.popover?.buttons?.backLabel ?? "Back step";
  });
  const label = backLabel ?? configuredLabel;

  if (isHidden || isFirstStep) {
    return null;
  }

  const baseProps = {
    "aria-controls": ariaControls,
    "aria-label": ariaLabel || label,
    disabled: isDisabled || isStepDisabled,
    type: "button",
    "data-action": "back",
    "data-glow-tour-back-trigger": true,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      glowTour.state.back();
    },
  } as const;

  if (children) {
    if (typeof children === "function") {
      return children({ ...baseProps, ...props });
    }
    return React.cloneElement(children, { ...baseProps, ...props });
  }

  return (
    <button {...baseProps} {...props}>
      {label}
    </button>
  );
}

export function NextTrigger({
  children,
  finishLabel,
  nextLabel,
  "aria-controls": ariaControls = POPOVER_ID,
  "aria-label": ariaLabel,
  ...props
}: NextTriggerProps) {
  const isDisabled = useValue(glowTour.state.snapshot, (state) => {
    return state.canGoNext === false;
  });

  const stepProps = useGlowTourStepProps();

  const isHidden = useValue(stepProps, (state) => {
    return state.hideNextButton;
  });

  const isStepDisabled = useValue(stepProps, (state) => {
    return state.disableNextButton;
  });

  const isLastStep = useValue(glowTour.state.snapshot, (state) => {
    return state.isLastStep;
  });

  const configuredLabels = useValue(glowTour.state.snapshot, (state) => {
    return {
      nextLabel: state.startOptions.popover?.buttons?.nextLabel ?? "Next step",
      finishLabel: state.startOptions.popover?.buttons?.finishLabel ?? "Finish tour",
    };
  });

  if (isHidden) {
    return null;
  }

  const label = isLastStep
    ? (finishLabel ?? configuredLabels.finishLabel)
    : (nextLabel ?? configuredLabels.nextLabel);

  const baseProps = {
    "aria-controls": ariaControls,
    "aria-label": ariaLabel || label,
    disabled: isDisabled || isStepDisabled,
    type: "button",
    "data-action": "next",
    "data-glow-tour-next-trigger": true,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      glowTour.state.next();
    },
  } as const;

  if (children) {
    if (typeof children === "function") {
      return children({ ...baseProps, ...props });
    }
    return React.cloneElement(children, { ...baseProps, ...props });
  }

  return (
    <button {...baseProps} {...props}>
      {label}
    </button>
  );
}

function useGlowTourStepProps() {
  const step = useValue(glowTour.state.snapshot, (state) => state.currentStep);

  return React.useMemo(
    () =>
      step?.currentProps ??
      new Observable<WorkflowStep<React.ReactNode>["props"]["_value"]>({
        content: "",
        title: "",
      }),
    [step?.currentProps],
  );
}

export const GlowTour = {
  Root,
  Popover,
  Header,
  Content,
  Footer,
  Overlay,
  Pointer,
  BackTrigger,
  NextTrigger,
};
