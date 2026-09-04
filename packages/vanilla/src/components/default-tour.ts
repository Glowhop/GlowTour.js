import type { VanillaGlowTour } from "../glow-tour";
import { areGlowTourElementsRegistered, type GlowTourRootElement } from "./web-components";

/** Options for creating a default tour element. */
export interface CreateDefaultTourElementOptions {
  /** Optional prefix for internal element IDs. */
  readonly idPrefix?: string;
}

/**
 * Creates a default tour UI element with all standard components.
 *
 * This function creates a complete tour UI hierarchy including overlay, pointer,
 * popover with header, content, footer, and navigation buttons.
 *
 * @param tour The tour controller instance.
 * @param options Configuration options.
 * @returns The root tour element ready to append to the DOM.
 * @throws Throws if custom elements are not registered. Call `registerGlowTourElements()` or import `@glowhop/vanilla-tour/auto` first.
 */
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
