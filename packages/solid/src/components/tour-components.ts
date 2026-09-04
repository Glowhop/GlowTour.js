import type { GlowTour as CoreGlowTour, TourState } from "@glowhop/core-tour";
import { type AdapterRootBinding, connectGlowTourRoot } from "@glowhop/core-tour/adapter";
import {
  type Accessor,
  createComponent,
  createContext,
  createEffect,
  createSignal,
  type JSX,
  mergeProps,
  onCleanup,
  type ParentProps,
  Show,
  splitProps,
  useContext,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { SolidTourContent } from "../glow-tour";
import { DefaultTour } from "./default-tour";

type Tour = CoreGlowTour<SolidTourContent>;
type RootProps = ParentProps<
  Omit<JSX.HTMLAttributes<HTMLDivElement>, "id" | "ref"> & {
    idPrefix?: string;
    tour: Tour;
  }
>;
type ElementProps = ParentProps<
  Omit<JSX.HTMLAttributes<HTMLElement>, "id" | "ref"> & { as?: ValidComponent }
>;
type ContentProps = Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "id">;
type OverlayProps = ParentProps<Omit<JSX.SvgSVGAttributes<SVGSVGElement>, "ref">>;
export interface PointerDirectionContent {
  readonly top?: JSX.Element;
  readonly bottom?: JSX.Element;
  readonly left?: JSX.Element;
  readonly right?: JSX.Element;
}

const DEFAULT_POINTER_DIRECTION_CONTENT: Required<PointerDirectionContent> = {
  bottom: "👇",
  left: "👈",
  right: "👉",
  top: "👆",
};

type PointerProps = Omit<JSX.HTMLAttributes<HTMLElement>, "aria-hidden" | "children" | "ref"> & {
  as?: ValidComponent;
  directionContent?: PointerDirectionContent;
};
type ButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> & {
  children?: (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => JSX.Element;
  disabled?: boolean;
};
type BackTriggerProps = ButtonProps & { backLabel?: string };
type AdvanceTriggerProps = ButtonProps & { finishLabel?: string; advanceLabel?: string };
type CancelTriggerProps = ButtonProps;
type ButtonClickEvent = MouseEvent & { currentTarget: HTMLButtonElement; target: Element };

interface TourContextValue {
  readonly binding: () => AdapterRootBinding | null;
  readonly tour: () => Tour;
}

const TourContext = createContext<TourContextValue>();

function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("GlowTour components must be rendered inside <GlowTour.Root tour={...}>.");
  }
  return context;
}

function useTourSnapshot(tour: () => Tour) {
  const [snapshot, setSnapshot] = createSignal<TourState<SolidTourContent>>(tour().state.get());
  createEffect(() => {
    const activeTour = tour();
    setSnapshot(activeTour.state.get());
    const unsubscribe = activeTour.state.subscribe(setSnapshot);
    onCleanup(unsubscribe);
  });
  return snapshot;
}

export function useTour(): Accessor<TourState<SolidTourContent>> {
  return useTourSnapshot(useTourContext().tour);
}

function useBoundElement<T extends Element>(
  bind: (binding: AdapterRootBinding, element: T) => () => void,
) {
  const context = useTourContext();
  const [element, setElement] = createSignal<T | null>(null);
  createEffect(() => {
    const activeBinding = context.binding();
    const activeElement = element();
    if (!activeBinding || !activeElement) return;
    return bind(activeBinding, activeElement);
  });
  return setElement;
}

function currentStep(snapshot: TourState<SolidTourContent>) {
  return snapshot.currentStep?.currentProps ?? null;
}

export function Root(props: RootProps): JSX.Element {
  const [local, other] = splitProps(props, ["children", "idPrefix", "tour"]);
  const [element, setElement] = createSignal<HTMLElement | null>(null);
  const [binding, setBinding] = createSignal<AdapterRootBinding | null>(null);

  createEffect(() => {
    const root = element();
    const tour = local.tour;
    const idPrefix = local.idPrefix;
    if (!root) return;
    const lease = connectGlowTourRoot(tour, {
      idPrefix,
      root,
    });
    setBinding(lease);
    onCleanup(() => {
      lease.release();
      setBinding((active) => (active === lease ? null : active));
    });
  });

  return createComponent(TourContext.Provider, {
    value: {
      binding,
      tour() {
        return local.tour;
      },
    },
    get children() {
      return createComponent(
        Dynamic,
        mergeProps(other, {
          component: "div",
          "data-glow-tour-root": "",
          ref: setElement,
          get children() {
            return local.children;
          },
        }),
      );
    },
  });
}

export function Popover(props: ElementProps): JSX.Element {
  const context = useTourContext();
  const [local, other] = splitProps(props, ["as", "children"]);
  const ref = useBoundElement<HTMLElement>((binding, element) => binding.bindPopover(element));

  return createComponent(
    Dynamic,
    mergeProps(other, {
      get "aria-describedby"() {
        return context.binding()?.ids.description;
      },
      get "aria-labelledby"() {
        return context.binding()?.ids.title;
      },
      get component() {
        return local.as ?? "section";
      },
      "data-glow-tour-popover": "",
      get id() {
        return context.binding()?.ids.popover;
      },
      ref,
      role: "dialog",
      tabIndex: -1,
      get children() {
        return local.children;
      },
    }),
  );
}

export function Header(props: ContentProps): JSX.Element {
  const context = useTourContext();
  const snapshot = useTourSnapshot(context.tour);
  return createComponent(
    Dynamic,
    mergeProps(props, {
      component: "header",
      "data-glow-tour-header": "",
      get id() {
        return context.binding()?.ids.title;
      },
      get children() {
        return currentStep(snapshot())?.title ?? null;
      },
    }),
  );
}

export function Content(props: ContentProps): JSX.Element {
  const context = useTourContext();
  const snapshot = useTourSnapshot(context.tour);
  return createComponent(
    Dynamic,
    mergeProps(props, {
      "aria-live": "polite",
      component: "div",
      "data-glow-tour-content": "",
      get id() {
        return context.binding()?.ids.description;
      },
      get children() {
        return currentStep(snapshot())?.content ?? null;
      },
    }),
  );
}

export function Footer(props: ElementProps): JSX.Element {
  const context = useTourContext();
  const snapshot = useTourSnapshot(context.tour);
  return Show({
    get when() {
      return !currentStep(snapshot())?.popover?.hideFooter;
    },
    get children() {
      return createComponent(
        Dynamic,
        mergeProps(props, {
          component: "footer",
          "data-glow-tour-footer": "",
        }),
      );
    },
  });
}

export function Overlay(props: OverlayProps): JSX.Element {
  const [local, other] = splitProps(props, ["children", "viewBox"]);
  const ref = useBoundElement<SVGSVGElement>((binding, element) => binding.bindOverlay(element));
  const path = createComponent(Dynamic, {
    component: "path",
    "data-glow-tour-overlay-path": "",
    "fill-rule": "evenodd",
  });

  return createComponent(
    Dynamic,
    mergeProps(other, {
      "aria-hidden": true,
      component: "svg",
      "data-glow-tour-overlay": "",
      focusable: "false",
      ref,
      role: "presentation",
      get viewBox() {
        return local.viewBox ?? "0 0 0 0";
      },
      get children() {
        return [path, local.children];
      },
    }),
  );
}

export function Pointer(props: PointerProps): JSX.Element {
  const [local, other] = splitProps(props, ["as", "directionContent"]);
  const ref = useBoundElement<HTMLElement>((binding, element) => binding.bindPointer(element));
  const directions = (
    Object.keys(DEFAULT_POINTER_DIRECTION_CONTENT) as Array<keyof PointerDirectionContent>
  ).map((direction) =>
    createComponent(Dynamic, {
      component: "div",
      "data-glow-tour-pointer-direction": direction,
      get children() {
        return local.directionContent?.[direction] ?? DEFAULT_POINTER_DIRECTION_CONTENT[direction];
      },
    }),
  );

  return createComponent(
    Dynamic,
    mergeProps(other, {
      "aria-hidden": "true",
      get component() {
        return local.as ?? "div";
      },
      "data-glow-tour-pointer": "",
      ref,
      children: directions,
    }),
  );
}

function Trigger(
  props: ButtonProps & {
    capabilityDisabled: boolean;
    label: string;
    marker: "cancel" | "advance" | "previous";
  },
): JSX.Element {
  const context = useTourContext();
  const [local, other] = splitProps(props, ["children", "capabilityDisabled", "label", "marker"]);
  const buttonProps = mergeProps(other, {
    get "aria-controls"() {
      return context.binding()?.ids.popover;
    },
    get "aria-label"() {
      return other["aria-label"] || local.label;
    },
    get "aria-disabled"() {
      return local.capabilityDisabled || other.disabled === true;
    },
    get "data-glow-tour-cancel-trigger"() {
      return local.marker === "cancel" ? true : undefined;
    },
    get "data-glow-tour-consumer-disabled"() {
      return other.disabled === true ? "true" : undefined;
    },
    get "data-glow-tour-advance-trigger"() {
      return local.marker === "advance" ? true : undefined;
    },
    get "data-glow-tour-previous-trigger"() {
      return local.marker === "previous" ? true : undefined;
    },
    get disabled() {
      return local.capabilityDisabled || other.disabled === true;
    },
    onClick(event: ButtonClickEvent) {
      if (typeof other.onClick === "function") other.onClick(event);
    },
    type: "button" as const,
  });

  if (local.children) return local.children(buttonProps);
  return createComponent(
    Dynamic,
    mergeProps(buttonProps, {
      component: "button",
      get children() {
        return local.label;
      },
    }),
  );
}

export function BackTrigger(props: BackTriggerProps): JSX.Element {
  const context = useTourContext();
  const snapshot = useTourSnapshot(context.tour);
  return Show({
    get when() {
      const step = currentStep(snapshot());
      return !step?.popover?.hidePreviousButton;
    },
    get children() {
      return Trigger(
        mergeProps(props, {
          get capabilityDisabled() {
            return (
              !snapshot().canPrevious ||
              currentStep(snapshot())?.popover?.disablePreviousButton === true
            );
          },
          label: props.backLabel ?? "Back step",
          marker: "previous" as const,
        }),
      );
    },
  });
}

export function AdvanceTrigger(props: AdvanceTriggerProps): JSX.Element {
  const context = useTourContext();
  const snapshot = useTourSnapshot(context.tour);
  return Show({
    get when() {
      return !currentStep(snapshot())?.popover?.hideAdvanceButton;
    },
    get children() {
      return Trigger(
        mergeProps(props, {
          get capabilityDisabled() {
            return (
              !snapshot().canAdvance ||
              currentStep(snapshot())?.popover?.disableAdvanceButton === true
            );
          },
          get label() {
            return snapshot().isLastStep
              ? (props.finishLabel ?? "Finish tour")
              : (props.advanceLabel ?? "Advance step");
          },
          marker: "advance" as const,
        }),
      );
    },
  });
}

export function CancelTrigger(props: CancelTriggerProps): JSX.Element {
  const context = useTourContext();
  const snapshot = useTourSnapshot(context.tour);
  return Show({
    get when() {
      return snapshot().canCancel;
    },
    get children() {
      return Trigger(
        mergeProps(props, {
          get capabilityDisabled() {
            return !snapshot().canCancel;
          },
          label: "Skip",
          marker: "cancel" as const,
        }),
      );
    },
  });
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
