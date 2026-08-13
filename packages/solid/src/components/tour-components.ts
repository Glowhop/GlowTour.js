import type { DynamicStepProps, WorkflowState } from "@glowhop/core-tour";
import {
  createComponent,
  createEffect,
  createSignal,
  type JSX,
  mergeProps,
  onCleanup,
  type ParentProps,
  Show,
  splitProps,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { SolidTourContent } from "../glow-tour";
import { glowTour } from "../glow-tour";

type ElementProps = ParentProps<
  JSX.HTMLAttributes<HTMLElement> & {
    as?: ValidComponent;
  }
>;
type ContentProps = Omit<JSX.HTMLAttributes<HTMLElement>, "children">;
type FooterProps = ParentProps<JSX.HTMLAttributes<HTMLElement>>;
type OverlayProps = ParentProps<Omit<JSX.SvgSVGAttributes<SVGSVGElement>, "ref">>;
type PointerProps = ParentProps<
  Omit<JSX.HTMLAttributes<HTMLElement>, "aria-hidden"> & {
    as?: ValidComponent;
  }
>;
type ButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> & {
  children?: (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => JSX.Element;
};
type BackTriggerProps = ButtonProps & { backLabel?: string };
type NextTriggerProps = ButtonProps & { finishLabel?: string; nextLabel?: string };

const POPOVER_ID = "glow-tour-popover";
const TITLE_ID = "glow-tour-title";
const DESCRIPTION_ID = "glow-tour-description";

function useTourSnapshot() {
  const [snapshot, setSnapshot] = createSignal<WorkflowState<SolidTourContent>>(
    glowTour.state.get(),
  );
  const unsubscribe = glowTour.state.subscribe(setSnapshot);
  onCleanup(unsubscribe);
  return snapshot;
}

function useCurrentStepProps() {
  const snapshot = useTourSnapshot();
  const [stepProps, setStepProps] = createSignal<DynamicStepProps<SolidTourContent>>({
    content: null,
    title: null,
  });

  createEffect(() => {
    const step = snapshot().currentStep;
    if (!step) {
      setStepProps({ content: null, title: null });
      return;
    }

    setStepProps(step.currentProps.get());
    onCleanup(step.currentProps.subscribe(setStepProps));
  });

  return stepProps;
}

export function Root(props: ParentProps): JSX.Element {
  return props.children;
}

export function Popover(props: ElementProps): JSX.Element {
  const [local, other] = splitProps(props, [
    "as",
    "children",
    "aria-describedby",
    "aria-labelledby",
    "id",
    "role",
  ]);
  onCleanup(() => glowTour.state.registerElementPopover(null));

  return createComponent(
    Dynamic,
    mergeProps(other, {
      get component() {
        return local.as ?? "section";
      },
      get "aria-describedby"() {
        return local["aria-describedby"] ?? DESCRIPTION_ID;
      },
      get "aria-labelledby"() {
        return local["aria-labelledby"] ?? TITLE_ID;
      },
      "data-glow-tour-popover": "",
      get id() {
        return local.id ?? POPOVER_ID;
      },
      ref: (element: HTMLElement) => glowTour.state.registerElementPopover(element),
      role: local.role ?? "dialog",
      tabIndex: -1,
      get children() {
        return local.children;
      },
    }),
  );
}

export function Header(props: ContentProps): JSX.Element {
  const stepProps = useCurrentStepProps();
  return createComponent(
    Dynamic,
    mergeProps(props, {
      component: "header",
      "data-glow-tour-header": "",
      get id() {
        return props.id ?? TITLE_ID;
      },
      get children() {
        return stepProps().title;
      },
    }),
  );
}

export function Content(props: ContentProps): JSX.Element {
  const stepProps = useCurrentStepProps();
  return createComponent(
    Dynamic,
    mergeProps(props, {
      get "aria-live"() {
        return props["aria-live"] ?? "polite";
      },
      component: "div",
      "data-glow-tour-content": "",
      get id() {
        return props.id ?? DESCRIPTION_ID;
      },
      get children() {
        return stepProps().content;
      },
    }),
  );
}

export function Footer(props: FooterProps): JSX.Element {
  const stepProps = useCurrentStepProps();
  return Show({
    get when() {
      return !stepProps().hideFooter;
    },
    get children() {
      return createComponent(
        Dynamic,
        mergeProps(props, {
          component: "footer",
          "data-glow-tour-footer": "",
          get children() {
            return props.children;
          },
        }),
      );
    },
  });
}

export function Overlay(props: OverlayProps): JSX.Element {
  const [local, other] = splitProps(props, ["aria-hidden", "children", "viewBox"]);
  onCleanup(() => glowTour.state.registerElementOverlay(null));

  const path = createComponent(Dynamic, {
    component: "path",
    "data-glow-tour-overlay-path": "",
    "fill-rule": "evenodd",
  });

  return createComponent(
    Dynamic,
    mergeProps(other, {
      get "aria-hidden"() {
        return local["aria-hidden"] ?? true;
      },
      component: "svg",
      "data-glow-tour-overlay": "",
      focusable: "false",
      ref: (element: SVGSVGElement) => glowTour.state.registerElementOverlay(element),
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
  onCleanup(() => glowTour.state.registerElementPointer(null));

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
      get component() {
        return local.as ?? "div";
      },
      "aria-hidden": "true",
      "data-glow-tour-pointer": "",
      ref: (element: HTMLElement) => glowTour.state.registerElementPointer(element),
      children: content,
    }),
  );
}

export function BackTrigger(props: BackTriggerProps): JSX.Element {
  const [local, other] = splitProps(props, [
    "aria-controls",
    "aria-label",
    "backLabel",
    "children",
  ]);
  const snapshot = useTourSnapshot();
  const stepProps = useCurrentStepProps();
  const label = () =>
    local.backLabel ?? snapshot().startOptions.popover?.buttons?.backLabel ?? "Back step";
  const buttonProps = mergeProps(
    {
      get "aria-controls"() {
        return local["aria-controls"] ?? POPOVER_ID;
      },
      get "aria-label"() {
        return local["aria-label"] || label();
      },
      "data-action": "back",
      "data-glow-tour-back-trigger": true,
      get disabled() {
        return !snapshot().canGoBack || stepProps().disableBackButton;
      },
      onClick(event: MouseEvent) {
        event.preventDefault();
        void glowTour.state.back();
      },
      type: "button" as const,
    },
    other,
  );

  return Show({
    get when() {
      return !snapshot().isFirstStep && !stepProps().hideBackButton;
    },
    get children() {
      if (local.children) return local.children(buttonProps);
      return createComponent(
        Dynamic,
        mergeProps(buttonProps, {
          component: "button",
          get children() {
            return label();
          },
        }),
      );
    },
  });
}

export function NextTrigger(props: NextTriggerProps): JSX.Element {
  const [local, other] = splitProps(props, [
    "aria-controls",
    "aria-label",
    "children",
    "finishLabel",
    "nextLabel",
  ]);
  const snapshot = useTourSnapshot();
  const stepProps = useCurrentStepProps();
  const label = () => {
    const labels = snapshot().startOptions.popover?.buttons;
    return snapshot().isLastStep
      ? (local.finishLabel ?? labels?.finishLabel ?? "Finish tour")
      : (local.nextLabel ?? labels?.nextLabel ?? "Next step");
  };
  const buttonProps = mergeProps(
    {
      get "aria-controls"() {
        return local["aria-controls"] ?? POPOVER_ID;
      },
      get "aria-label"() {
        return local["aria-label"] || label();
      },
      "data-action": "next",
      "data-glow-tour-next-trigger": true,
      get disabled() {
        return !snapshot().canGoNext || stepProps().disableNextButton;
      },
      onClick(event: MouseEvent) {
        event.preventDefault();
        void glowTour.state.next();
      },
      type: "button" as const,
    },
    other,
  );

  return Show({
    get when() {
      return !stepProps().hideNextButton;
    },
    get children() {
      if (local.children) return local.children(buttonProps);
      return createComponent(
        Dynamic,
        mergeProps(buttonProps, {
          component: "button",
          get children() {
            return label();
          },
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
};
