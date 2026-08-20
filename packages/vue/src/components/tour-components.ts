import type { GlowTour as CoreGlowTour, TourState } from "@glowhop/core-tour";
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
  shallowRef,
  watch,
} from "vue";
import { getAdapterBridge, type RootBinding, vueAdapter } from "../adapter-bridge";
import type { VueTourContent } from "../glow-tour";

type Tour = CoreGlowTour<VueTourContent>;

interface TourContextValue {
  readonly binding: Ref<RootBinding | null>;
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

function useStep() {
  const context = useTourContext();
  const snapshot = useTourSnapshot(context.tour);
  return () => snapshot.value.currentStep?.currentProps ?? null;
}

function useBoundElement<T extends Element>(
  bind: (binding: RootBinding, element: T) => () => void,
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

export const GlowTourRoot = defineComponent({
  name: componentName("Root"),
  inheritAttrs: false,
  props: {
    idPrefix: { type: String },
    tour: { required: true, type: Object as PropType<Tour> },
  },
  setup(props, { attrs, slots }) {
    const binding = shallowRef<RootBinding | null>(null);
    const tour = shallowRef(props.tour);
    provide(TOUR_CONTEXT, { binding, tour });

    let element: HTMLElement | null = null;
    let active:
      | { binding: RootBinding; idPrefix: string | undefined; root: HTMLElement; tour: Tour }
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
      const nextBinding = getAdapterBridge(activeTour).connectRoot({
        adapter: vueAdapter,
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

    watch([() => props.tour, () => props.idPrefix], connect, { flush: "sync" });
    onBeforeUnmount(release);

    return () =>
      h(
        "section",
        mergeProps(attrs, { "data-glow-tour-root": "", ref: setRoot }),
        slots.default?.(),
      );
  },
});

export const GlowTourHeader = defineComponent({
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

export const GlowTourContent = defineComponent({
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

export const GlowTourFooter = defineComponent({
  name: componentName("Footer"),
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const step = useStep();
    return () =>
      step()?.hideFooter
        ? null
        : h("footer", mergeProps(attrs, { "data-glow-tour-footer": "" }), slots.default?.());
  },
});

export const GlowTourPopover = defineComponent({
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

export const GlowTourPointer = defineComponent({
  name: componentName("Pointer"),
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const element = useBoundElement<HTMLElement>((binding, activeElement) =>
      binding.bindPointer(activeElement),
    );
    return () =>
      h(
        "div",
        mergeProps(attrs, { "aria-hidden": "true", "data-glow-tour-pointer": "", ref: element }),
        h("div", { "data-glow-tour-pointer-content": "" }, slots.default?.()),
      );
  },
});

export const GlowTourOverlay = defineComponent({
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
  marker: "back" | "cancel" | "next",
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
      "data-glow-tour-back-trigger": marker === "back" ? "" : undefined,
      "data-glow-tour-cancel-trigger": marker === "cancel" ? "" : undefined,
      "data-glow-tour-consumer-disabled": consumerDisabled ? "true" : undefined,
      "data-glow-tour-next-trigger": marker === "next" ? "" : undefined,
      disabled,
      type: "button",
    };
    return h("button", mergeProps(attrs, buttonProps), slots.default?.(buttonProps) ?? label());
  };
}

export const GlowTourBackTrigger = defineComponent({
  name: componentName("BackTrigger"),
  inheritAttrs: false,
  props: { ariaLabel: { type: String }, backLabel: { type: String } },
  setup(props, { attrs, slots }) {
    const context = useTourContext();
    const snapshot = useTourSnapshot(context.tour);
    const step = useStep();
    const renderTrigger = trigger(
      "back",
      () => !snapshot.value.canPrevious || step()?.disableBackButton === true,
      () => props.backLabel ?? "Back step",
      () => props.ariaLabel,
      attrs,
      slots,
    );
    return () => (snapshot.value.isFirstStep || step()?.hideBackButton ? null : renderTrigger());
  },
});

export const GlowTourNextTrigger = defineComponent({
  name: componentName("NextTrigger"),
  inheritAttrs: false,
  props: {
    ariaLabel: { type: String },
    finishLabel: { type: String },
    nextLabel: { type: String },
  },
  setup(props, { attrs, slots }) {
    const context = useTourContext();
    const snapshot = useTourSnapshot(context.tour);
    const step = useStep();
    const renderTrigger = trigger(
      "next",
      () => !snapshot.value.canAdvance || step()?.disableNextButton === true,
      () => {
        return snapshot.value.isLastStep
          ? (props.finishLabel ?? "Finish tour")
          : (props.nextLabel ?? "Next step");
      },
      () => props.ariaLabel,
      attrs,
      slots,
    );
    return () => (step()?.hideNextButton ? null : renderTrigger());
  },
});

export const GlowTourCancelTrigger = defineComponent({
  name: componentName("CancelTrigger"),
  inheritAttrs: false,
  props: { ariaLabel: { type: String }, cancelLabel: { type: String } },
  setup(props, { attrs, slots }) {
    const context = useTourContext();
    const snapshot = useTourSnapshot(context.tour);
    const renderTrigger = trigger(
      "cancel",
      () => !snapshot.value.canCancel,
      () => props.cancelLabel ?? "Cancel tour",
      () => props.ariaLabel,
      attrs,
      slots,
    );
    return () => (snapshot.value.canCancel ? renderTrigger() : null);
  },
});
