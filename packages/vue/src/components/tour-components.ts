import type { GlowTour as CoreGlowTour, TourState } from "@glowhop/core-tour";
import { type AdapterRootBinding, connectGlowTourRoot } from "@glowhop/core-tour/adapter";
import type { VNodeChild } from "vue";
import {
  defineComponent,
  h,
  type InjectionKey,
  inject,
  mergeProps,
  onBeforeUnmount,
  type PropType,
  provide,
  type Ref,
  type ShallowRef,
  shallowRef,
  watch,
} from "vue";
import type { VueTourContent } from "../glow-tour.js";

type Tour = CoreGlowTour<VueTourContent>;

export interface PointerDirectionContent {
  readonly top?: VNodeChild;
  readonly bottom?: VNodeChild;
  readonly left?: VNodeChild;
  readonly right?: VNodeChild;
}

const DEFAULT_POINTER_DIRECTION_CONTENT: Required<PointerDirectionContent> = {
  bottom: "👇",
  left: "👈",
  right: "👉",
  top: "👆",
};

interface TourContextValue {
  readonly binding: Ref<AdapterRootBinding | null>;
  readonly tour: Ref<Tour>;
}

const TOUR_CONTEXT: InjectionKey<TourContextValue> = Symbol("GlowTourContext");

function componentName(name: string) {
  return `GlowTour${name}`;
}

function useTourContext() {
  const context = inject(TOUR_CONTEXT);
  if (!context) {
    throw new Error("GlowTour components must be rendered inside <GlowTourRoot tour={...}>.");
  }
  return context;
}

function useTourSnapshot(tour: Ref<Tour>) {
  const snapshot = shallowRef<TourState<VueTourContent>>(tour.value.state.get());
  watch(
    tour,
    (activeTour, _previousTour, onCleanup) => {
      snapshot.value = activeTour.state.get();
      onCleanup(activeTour.state.subscribe((next) => (snapshot.value = next)));
    },
    { immediate: true },
  );
  return snapshot;
}

export function useTour(): ShallowRef<TourState<VueTourContent>> {
  const { tour } = useTourContext();
  return useTourSnapshot(tour);
}

function useStep() {
  const context = useTourContext();
  const snapshot = useTourSnapshot(context.tour);
  return () => snapshot.value.currentStep?.currentProps ?? null;
}

function useBoundElement<T extends Element>(
  bind: (binding: AdapterRootBinding, element: T) => () => void,
) {
  const context = useTourContext();
  const element = shallowRef<T | null>(null);
  watch(
    [context.binding, element],
    ([binding, activeElement], _previous, onCleanup) => {
      if (!binding || !activeElement) return;
      onCleanup(bind(binding, activeElement as T));
    },
    { flush: "post" },
  );
  return element;
}

function isConsumerDisabled(attrs: Record<string, unknown>) {
  return attrs.disabled === "" || attrs.disabled === true;
}

export const GlowTourRoot = /* @__PURE__ */ defineComponent({
  name: componentName("Root"),
  inheritAttrs: false,
  props: {
    idPrefix: { type: String },
    tour: { required: true, type: Object as PropType<Tour> },
  },
  setup(props, { attrs, slots }) {
    const binding = shallowRef<AdapterRootBinding | null>(null);
    const tour = shallowRef(props.tour);
    provide(TOUR_CONTEXT, { binding, tour });

    let element: HTMLElement | null = null;
    let active:
      | { binding: AdapterRootBinding; idPrefix: string | undefined; root: HTMLElement; tour: Tour }
      | undefined;

    const release = () => {
      const current = active;
      if (!current) return;
      active = undefined;
      current.binding.release();
      if (binding.value === current.binding) binding.value = null;
    };

    const connect = () => {
      const activeTour = props.tour;
      const idPrefix = props.idPrefix;
      tour.value = activeTour;
      if (active?.root === element && active.tour === activeTour && active.idPrefix === idPrefix) {
        return;
      }
      release();
      if (!element) return;
      const nextBinding = connectGlowTourRoot(activeTour, {
        idPrefix,
        root: element,
      });
      active = { binding: nextBinding, idPrefix, root: element, tour: activeTour };
      binding.value = nextBinding;
    };

    const setRoot = (root: unknown) => {
      element = root instanceof HTMLElement ? root : null;
      connect();
    };

    watch([() => props.tour, () => props.idPrefix], connect);
    onBeforeUnmount(release);

    return () =>
      h(
        "section",
        mergeProps(attrs, { "data-glow-tour-root": "", ref: setRoot }),
        slots.default?.(),
      );
  },
});

export const GlowTourHeader = /* @__PURE__ */ defineComponent({
  name: componentName("Header"),
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const context = useTourContext();
    const step = useStep();
    return () =>
      h(
        "header",
        mergeProps(attrs, { "data-glow-tour-header": "", id: context.binding.value?.ids.title }),
        [step()?.title ?? null],
      );
  },
});

export const GlowTourContent = /* @__PURE__ */ defineComponent({
  name: componentName("Content"),
  inheritAttrs: false,
  props: { ariaLive: { default: "polite", type: String } },
  setup(props, { attrs }) {
    const context = useTourContext();
    const step = useStep();
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          "aria-live": props.ariaLive,
          "data-glow-tour-content": "",
          id: context.binding.value?.ids.description,
        }),
        [step()?.content ?? null],
      );
  },
});

export const GlowTourFooter = /* @__PURE__ */ defineComponent({
  name: componentName("Footer"),
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const step = useStep();
    return () =>
      step()?.popover?.hideFooter
        ? null
        : h("footer", mergeProps(attrs, { "data-glow-tour-footer": "" }), slots.default?.());
  },
});

export const GlowTourPopover = /* @__PURE__ */ defineComponent({
  name: componentName("Popover"),
  inheritAttrs: false,
  props: { role: { default: "dialog", type: String } },
  setup(props, { attrs, slots }) {
    const context = useTourContext();
    const element = useBoundElement<HTMLElement>((binding, activeElement) =>
      binding.bindPopover(activeElement),
    );
    return () =>
      h(
        "section",
        mergeProps(attrs, {
          "aria-describedby": context.binding.value?.ids.description,
          "aria-labelledby": context.binding.value?.ids.title,
          "data-glow-tour-popover": "",
          id: context.binding.value?.ids.popover,
          ref: element,
          role: props.role,
          tabindex: -1,
        }),
        slots.default?.(),
      );
  },
});

export const GlowTourPointer = /* @__PURE__ */ defineComponent({
  name: componentName("Pointer"),
  inheritAttrs: false,
  props: {
    directionContent: { default: undefined, type: Object as PropType<PointerDirectionContent> },
  },
  setup(props, { attrs }) {
    const element = useBoundElement<HTMLElement>((binding, activeElement) =>
      binding.bindPointer(activeElement),
    );
    return () => {
      const content = { ...DEFAULT_POINTER_DIRECTION_CONTENT, ...props.directionContent };
      return h(
        "div",
        mergeProps(attrs, { "aria-hidden": "true", "data-glow-tour-pointer": "", ref: element }),
        (
          Object.keys(DEFAULT_POINTER_DIRECTION_CONTENT) as Array<keyof PointerDirectionContent>
        ).map((direction) =>
          h("div", { "data-glow-tour-pointer-direction": direction }, [content[direction]]),
        ),
      );
    };
  },
});

export const GlowTourOverlay = /* @__PURE__ */ defineComponent({
  name: componentName("Overlay"),
  inheritAttrs: false,
  props: {
    ariaHidden: { default: true, type: Boolean },
    focusable: { default: "false", type: String },
    viewBox: { default: "0 0 0 0", type: String },
  },
  setup(props, { attrs, slots }) {
    const element = useBoundElement<SVGSVGElement>((binding, activeElement) =>
      binding.bindOverlay(activeElement),
    );
    return () =>
      h(
        "svg",
        mergeProps(attrs, {
          "aria-hidden": props.ariaHidden,
          "data-glow-tour-overlay": "",
          focusable: props.focusable,
          ref: element,
          role: "presentation",
          viewBox: props.viewBox,
        }),
        [
          h("path", { "data-glow-tour-overlay-path": "", "fill-rule": "evenodd" }),
          slots.default?.(),
        ],
      );
  },
});

function trigger(
  marker: "cancel" | "advance" | "previous",
  capabilityDisabled: () => boolean,
  label: () => string,
  ariaLabel: () => string | undefined,
  attrs: Record<string, unknown>,
  slots: { default?: (props: Record<string, unknown>) => VNodeChild[] },
) {
  const context = useTourContext();
  return () => {
    const consumerDisabled = isConsumerDisabled(attrs);
    const disabled = capabilityDisabled() || consumerDisabled;
    const buttonProps = {
      "aria-controls": context.binding.value?.ids.popover,
      "aria-disabled": disabled ? "true" : "false",
      "aria-label": attrs["aria-label"] ?? ariaLabel() ?? label(),
      "data-glow-tour-cancel-trigger": marker === "cancel" ? "" : undefined,
      "data-glow-tour-consumer-disabled": consumerDisabled ? "true" : undefined,
      "data-glow-tour-advance-trigger": marker === "advance" ? "" : undefined,
      "data-glow-tour-previous-trigger": marker === "previous" ? "" : undefined,
      disabled,
      type: "button",
    };
    return h("button", mergeProps(attrs, buttonProps), slots.default?.(buttonProps) ?? label());
  };
}

export const GlowTourBackTrigger = /* @__PURE__ */ defineComponent({
  name: componentName("BackTrigger"),
  inheritAttrs: false,
  props: { ariaLabel: { type: String }, backLabel: { type: String } },
  setup(props, { attrs, slots }) {
    const context = useTourContext();
    const snapshot = useTourSnapshot(context.tour);
    const step = useStep();
    const renderTrigger = trigger(
      "previous",
      () => !snapshot.value.canPrevious || step()?.popover?.disablePreviousButton === true,
      () => props.backLabel ?? "Back step",
      () => props.ariaLabel,
      attrs,
      slots,
    );
    return () => (step()?.popover?.hidePreviousButton ? null : renderTrigger());
  },
});

export const GlowTourAdvanceTrigger = /* @__PURE__ */ defineComponent({
  name: componentName("AdvanceTrigger"),
  inheritAttrs: false,
  props: {
    ariaLabel: { type: String },
    finishLabel: { type: String },
    advanceLabel: { type: String },
  },
  setup(props, { attrs, slots }) {
    const context = useTourContext();
    const snapshot = useTourSnapshot(context.tour);
    const step = useStep();
    const renderTrigger = trigger(
      "advance",
      () => !snapshot.value.canAdvance || step()?.popover?.disableAdvanceButton === true,
      () => {
        return snapshot.value.isLastStep
          ? (props.finishLabel ?? "Finish tour")
          : (props.advanceLabel ?? "Advance step");
      },
      () => props.ariaLabel,
      attrs,
      slots,
    );
    return () => (step()?.popover?.hideAdvanceButton ? null : renderTrigger());
  },
});

export const GlowTourCancelTrigger = /* @__PURE__ */ defineComponent({
  name: componentName("CancelTrigger"),
  inheritAttrs: false,
  props: { ariaLabel: { type: String } },
  setup(props, { attrs, slots }) {
    const context = useTourContext();
    const snapshot = useTourSnapshot(context.tour);
    const renderTrigger = trigger(
      "cancel",
      () => !snapshot.value.canCancel,
      () => "Skip",
      () => props.ariaLabel,
      attrs,
      slots,
    );
    return () => (snapshot.value.canCancel ? renderTrigger() : null);
  },
});
