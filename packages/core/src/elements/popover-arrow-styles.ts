const ARROW_STYLES_SELECTOR = "style[data-glow-tour-core-arrow-styles]";

const ARROW_STYLES = `
:where([data-glow-tour-popover])::before {
  background-color: var(--glow-tour-arrow-color, var(--glow-tour-color-surface, #ffffff));
  border: var(--glow-tour-arrow-border-width, 1px) solid var(--glow-tour-arrow-border-color, var(--glow-tour-color-border, #dedee3));
  border-radius: var(--glow-tour-arrow-border-radius, 0px);
  box-sizing: border-box;
  content: "";
  height: var(--glow-tour-arrow-size, 12px);
  pointer-events: none;
  position: absolute;
  width: var(--glow-tour-arrow-size, 12px);
}

:where([data-glow-tour-popover][data-glow-tour-placement="top"])::before {
  border-left: 0;
  border-top: 0;
  bottom: 0;
  left: var(--glow-tour-arrow-offset);
  transform: translate(-50%, 50%) rotate(45deg);
}

:where([data-glow-tour-popover][data-glow-tour-placement="bottom"])::before {
  border-bottom: 0;
  border-right: 0;
  left: var(--glow-tour-arrow-offset);
  top: 0;
  transform: translate(-50%, -50%) rotate(45deg);
}

:where([data-glow-tour-popover][data-glow-tour-placement="left"])::before {
  border-bottom: 0;
  border-left: 0;
  right: 0;
  top: var(--glow-tour-arrow-offset);
  transform: translate(50%, -50%) rotate(45deg);
}

:where([data-glow-tour-popover][data-glow-tour-placement="right"])::before {
  border-right: 0;
  border-top: 0;
  left: 0;
  top: var(--glow-tour-arrow-offset);
  transform: translate(-50%, -50%) rotate(45deg);
}

:where([data-glow-tour-popover][data-glow-tour-arrow-hidden])::before {
  display: none;
}
`;

export interface PopoverArrowStylesOptions {
  readonly nonce?: string;
  readonly disabled?: boolean;
}

export function ensurePopoverArrowStyles(element: Element, options?: PopoverArrowStylesOptions) {
  if (options?.disabled) return;
  if (typeof element.getRootNode !== "function") return;
  const root = element.getRootNode();
  if (root.nodeType !== 9 && root.nodeType !== 11) return;
  const styleRoot = root as Document | ShadowRoot;
  if (styleRoot.querySelector(ARROW_STYLES_SELECTOR)) return;

  const ownerDocument = root.nodeType === 9 ? (root as Document) : element.ownerDocument;
  const style = ownerDocument.createElement("style");
  style.setAttribute("data-glow-tour-core-arrow-styles", "");
  if (options?.nonce) style.nonce = options.nonce;
  style.textContent = ARROW_STYLES;

  if (root.nodeType === 9) {
    const document = root as Document;
    (document.head ?? document.documentElement).append(style);
  } else {
    (root as ShadowRoot).append(style);
  }
}
