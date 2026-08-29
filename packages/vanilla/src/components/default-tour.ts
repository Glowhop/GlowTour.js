import type { VanillaGlowTour } from "../glow-tour";
import { areGlowTourElementsRegistered, type GlowTourRootElement } from "./web-components";

export interface CreateDefaultTourElementOptions {
  readonly idPrefix?: string;
}

export function createDefaultTourElement(
  tour: VanillaGlowTour,
  options?: CreateDefaultTourElementOptions,
): GlowTourRootElement {
  if (!areGlowTourElementsRegistered()) {
    throw new Error(
      'Glow Tour custom elements are not registered. Call registerGlowTourElements() or import "@glowhop/vanilla-tour/auto" before creating a default tour.',
    );
  }
  const root = document.createElement("glow-tour-root");
  root.tour = tour;
  root.idPrefix = options?.idPrefix;

  const overlay = document.createElement("glow-tour-overlay");
  const pointer = document.createElement("glow-tour-pointer");
  const popover = document.createElement("glow-tour-popover");
  const header = document.createElement("glow-tour-header");
  const content = document.createElement("glow-tour-content");
  const footer = document.createElement("glow-tour-footer");
  const cancel = document.createElement("glow-tour-cancel-trigger");
  const back = document.createElement("glow-tour-back-trigger");
  const advance = document.createElement("glow-tour-advance-trigger");

  footer.append(cancel, back, advance);
  popover.append(header, content, footer);
  root.append(overlay, pointer, popover);
  return root;
}
