import type { GlowTour as CoreGlowTour, TourState } from "@glowhop/core-tour";
import {
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
import { getAdapterBridge, type RootBinding, solidAdapter } from "../adapter-bridge";
import type { SolidTourContent } from "../glow-tour";

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
type PointerProps = ParentProps<
  Omit<JSX.HTMLAttributes<HTMLElement>, "aria-hidden" | "ref"> & { as?: ValidComponent }
>;
type ButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> & {
  children?: (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => JSX.Element;
  disabled?: boolean;
};
type BackTriggerProps = ButtonProps & { backLabel?: string };
type NextTriggerProps = ButtonProps & { finishLabel?: string; nextLabel?: string };
type CancelTriggerProps = ButtonProps & { cancelLabel?: string };
type ButtonClickEvent = MouseEvent & { currentTarget: HTMLButtonElement; target: Element };

interface TourContextValue {
  readonly binding: () => RootBinding | null;
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

function useBoundElement<T extends Element>(
  bind: (binding: RootBinding, element: T) => () => void,
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
  const [binding, setBinding] = createSignal<RootBinding | null>(null);

  createEffect(() => {
    const root = element();
    const tour = local.tour;
    const idPrefix = local.idPrefix;
    if (!root) return;
    const lease = getAdapterBridge(tour).connectRoot({
      adapter: solidAdapter,
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
      return !currentStep(snapshot())?.hideFooter;
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
  const [local, other] = splitProps(props, ["as", "children"]);
  const ref = useBoundElement<HTMLElement>((binding, element) => binding.bindPointer(element));
  const content = createComponent(Dynamic, {
    component: "div",
    "data-glow-tour-pointer-content": "",
    get children() {
      return local.children;
    },
  });

  return createComponent(
    Dynamic,
    mergeProps(other, {
      "aria-hidden": "true",
      get component() {
        return local.as ?? "div";
      },
      "data-glow-tour-pointer": "",
      ref,
      children: content,
    }),
  );
}

function Trigger(
  props: ButtonProps & {
    tourCommand: () => Promise<void>;
    capabilityDisabled: boolean;
    label: string;
    marker: "back" | "cancel" | "next";
  },
): JSX.Element {
  const context = useTourContext();
  const [local, other] = splitProps(props, [
    "children",
    "tourCommand",
    "capabilityDisabled",
    "label",
    "marker",
  ]);
  const buttonProps = mergeProps(other, {
    get "aria-controls"() {
      return context.binding()?.ids.popover;
    },
    get "aria-label"() {
      return other["aria-label"] || local.label;
    },
    get "data-glow-tour-back-trigger"() {
      return local.marker === "back" ? true : undefined;
    },
    get "data-glow-tour-cancel-trigger"() {
      return local.marker === "cancel" ? true : undefined;
    },
    get "data-glow-tour-consumer-disabled"() {
      return other.disabled === true ? "true" : undefined;
    },
    get "data-glow-tour-next-trigger"() {
      return local.marker === "next" ? true : undefined;
    },
    get disabled() {
      return local.capabilityDisabled || other.disabled === true;
    },
    onClick(event: ButtonClickEvent) {
      if (typeof other.onClick === "function") other.onClick(event);
      if (local.capabilityDisabled || other.disabled === true || event.defaultPrevented) return;
      event.preventDefault();
      void local.tourCommand();
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
      return !snapshot().isFirstStep && !step?.hideBackButton;
    },
    get children() {
      return Trigger(
        mergeProps(props, {
          tourCommand: () => context.tour().previous(),
          get capabilityDisabled() {
            return !snapshot().canPrevious || currentStep(snapshot())?.disableBackButton === true;
          },
          label: props.backLabel ?? "Back step",
          marker: "back" as const,
        }),
      );
    },
  });
}

export function NextTrigger(props: NextTriggerProps): JSX.Element {
  const context = useTourContext();
  const snapshot = useTourSnapshot(context.tour);
  return Show({
    get when() {
      return !currentStep(snapshot())?.hideNextButton;
    },
    get children() {
      return Trigger(
        mergeProps(props, {
          tourCommand: () => context.tour().advance(),
          get capabilityDisabled() {
            return !snapshot().canAdvance || currentStep(snapshot())?.disableNextButton === true;
          },
          get label() {
            return snapshot().isLastStep
              ? (props.finishLabel ?? "Finish tour")
              : (props.nextLabel ?? "Next step");
          },
          marker: "next" as const,
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
          tourCommand: () => context.tour().cancel(),
          get capabilityDisabled() {
            return !snapshot().canCancel;
          },
          label: props.cancelLabel ?? "Cancel tour",
          marker: "cancel" as const,
        }),
      );
    },
  });
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
  CancelTrigger,
};
