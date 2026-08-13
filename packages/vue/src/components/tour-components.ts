import type { DynamicStepProps, WorkflowState } from "@glowhop/core-tour";
import type { VNodeChild } from "vue";
import {
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { glowTour } from "../glow-tour";

const POPOVER_ID = "glow-tour-popover";
const TITLE_ID = "glow-tour-title";
const DESCRIPTION_ID = "glow-tour-description";

function componentName(name: string) {
  return `GlowTour${name}`;
}

function useTourSnapshot() {
  const snapshot = shallowRef<WorkflowState<VNodeChild>>(glowTour.state.get());
  const unsubscribe = glowTour.state.subscribe((state) => {
    snapshot.value = state;
  });
  onBeforeUnmount(unsubscribe);
  return snapshot;
}

function useCurrentStepProps() {
  const snapshot = useTourSnapshot();
  const props = shallowRef<DynamicStepProps<VNodeChild>>({ content: null, title: null });
  let unsubscribe: (() => void) | undefined;

  watch(
    () => snapshot.value.currentStep,
    (step) => {
      unsubscribe?.();
      unsubscribe = undefined;
      if (!step) {
        props.value = { content: null, title: null };
        return;
      }
      props.value = step.currentProps.get();
      unsubscribe = step.currentProps.subscribe((value) => {
        props.value = value;
      });
    },
    { immediate: true },
  );

  onBeforeUnmount(() => unsubscribe?.());
  return props;
}

export const GlowTourRoot = defineComponent({
  name: componentName("Root"),
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h("section", mergeProps(attrs, { "data-glow-tour-root": "" }), slots.default?.());
  },
});

export const GlowTourHeader = defineComponent({
  name: componentName("Header"),
  inheritAttrs: false,
  props: { id: { default: TITLE_ID, type: String } },
  setup(props, { attrs }) {
    const stepProps = useCurrentStepProps();
    return () =>
      h("header", mergeProps(attrs, { "data-glow-tour-header": "", id: props.id }), [
        stepProps.value.title,
      ]);
  },
});

export const GlowTourContent = defineComponent({
  name: componentName("Content"),
  inheritAttrs: false,
  props: {
    ariaLive: { default: "polite", type: String },
    id: { default: DESCRIPTION_ID, type: String },
  },
  setup(props, { attrs }) {
    const stepProps = useCurrentStepProps();
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          "aria-live": props.ariaLive,
          "data-glow-tour-content": "",
          id: props.id,
        }),
        [stepProps.value.content],
      );
  },
});

export const GlowTourFooter = defineComponent({
  name: componentName("Footer"),
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const stepProps = useCurrentStepProps();
    return () =>
      stepProps.value.hideFooter
        ? null
        : h("footer", mergeProps(attrs, { "data-glow-tour-footer": "" }), slots.default?.());
  },
});

export const GlowTourPopover = defineComponent({
  name: componentName("Popover"),
  inheritAttrs: false,
  props: {
    ariaDescribedby: { default: DESCRIPTION_ID, type: String },
    ariaLabelledby: { default: TITLE_ID, type: String },
    id: { default: POPOVER_ID, type: String },
    role: { default: "dialog", type: String },
  },
  setup(props, { attrs, slots }) {
    const element = ref<HTMLElement | null>(null);
    onMounted(() => glowTour.state.registerElementPopover(element.value));
    onBeforeUnmount(() => glowTour.state.registerElementPopover(null));
    return () =>
      h(
        "section",
        mergeProps(attrs, {
          "aria-describedby": props.ariaDescribedby,
          "aria-labelledby": props.ariaLabelledby,
          "data-glow-tour-popover": "",
          id: props.id,
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
    const element = ref<HTMLElement | null>(null);
    onMounted(() => glowTour.state.registerElementPointer(element.value));
    onBeforeUnmount(() => glowTour.state.registerElementPointer(null));
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          "aria-hidden": "true",
          "data-glow-tour-pointer": "",
          ref: element,
        }),
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
    const element = ref<SVGSVGElement | null>(null);
    onMounted(() => glowTour.state.registerElementOverlay(element.value));
    onBeforeUnmount(() => glowTour.state.registerElementOverlay(null));
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

export const GlowTourBackTrigger = defineComponent({
  name: componentName("BackTrigger"),
  inheritAttrs: false,
  props: {
    ariaControls: { default: POPOVER_ID, type: String },
    ariaLabel: { type: String },
    backLabel: { type: String },
  },
  setup(props, { attrs, slots }) {
    const snapshot = useTourSnapshot();
    const stepProps = useCurrentStepProps();
    return () => {
      if (snapshot.value.isFirstStep || stepProps.value.hideBackButton) return null;
      const label =
        props.backLabel ?? snapshot.value.startOptions.popover?.buttons?.backLabel ?? "Back step";
      return h(
        "button",
        mergeProps(attrs, {
          "aria-controls": props.ariaControls,
          "aria-label": props.ariaLabel ?? label,
          "data-action": "back",
          "data-glow-tour-back-trigger": "",
          disabled: !snapshot.value.canGoBack || stepProps.value.disableBackButton,
          onClick: (event: MouseEvent) => {
            event.preventDefault();
            void glowTour.state.back();
          },
          type: "button",
        }),
        slots.default?.() ?? label,
      );
    };
  },
});

export const GlowTourNextTrigger = defineComponent({
  name: componentName("NextTrigger"),
  inheritAttrs: false,
  props: {
    ariaControls: { default: POPOVER_ID, type: String },
    ariaLabel: { type: String },
    finishLabel: { type: String },
    nextLabel: { type: String },
  },
  setup(props, { attrs, slots }) {
    const snapshot = useTourSnapshot();
    const stepProps = useCurrentStepProps();
    return () => {
      if (stepProps.value.hideNextButton) return null;
      const labels = snapshot.value.startOptions.popover?.buttons;
      const label = snapshot.value.isLastStep
        ? (props.finishLabel ?? labels?.finishLabel ?? "Finish tour")
        : (props.nextLabel ?? labels?.nextLabel ?? "Next step");
      return h(
        "button",
        mergeProps(attrs, {
          "aria-controls": props.ariaControls,
          "aria-label": props.ariaLabel ?? label,
          "data-action": "next",
          "data-glow-tour-next-trigger": "",
          disabled: !snapshot.value.canGoNext || stepProps.value.disableNextButton,
          onClick: (event: MouseEvent) => {
            event.preventDefault();
            void glowTour.state.next();
          },
          type: "button",
        }),
        slots.default?.() ?? label,
      );
    };
  },
});
