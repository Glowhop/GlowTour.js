/**
 * One delegated listener for every `[data-copy-button]` on the page.
 *
 * It lives in its own module, loaded once from MarketingLayout, rather than inside
 * CopyButton.astro: the examples gallery renders its code blocks through Astro's container API and
 * injects the resulting HTML into a React island, and a component script would not travel with
 * that HTML. Binding from the layout means a copy button works wherever its markup ends up.
 */

const RESET_MS = 2000;

/*
 * Visually hidden, styled inline rather than with a utility class: this element is created at
 * runtime, so a class name living only in a string here is not something a CSS build is obliged to
 * notice. If it ever stopped matching, the result would be stray "Copied" text at the foot of
 * every page.
 */
const status = document.createElement("div");
status.setAttribute("aria-live", "polite");
status.style.cssText =
  "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
document.body.append(status);

function resolveText(button: HTMLElement): string {
  const explicit = button.dataset.copyValue;
  if (explicit !== undefined) return explicit;
  // No literal value: copy the code block this button belongs to, rather than duplicating the
  // whole snippet into an attribute.
  const scope = button.closest("[data-copy-scope]");
  return scope?.querySelector("pre")?.textContent ?? "";
}

/**
 * The clipboard write can be refused outright — a browser setting, a permission prompt the visitor
 * dismissed. Selecting the text is the honest fallback: it makes the keyboard shortcut the message
 * suggests actually do something, instead of telling someone to copy an empty selection.
 */
function selectSource(button: HTMLElement): boolean {
  const scope = button.closest("[data-copy-scope]") ?? button.parentElement;
  const source = scope?.querySelector("pre, code");
  if (!source) return false;
  const range = document.createRange();
  range.selectNodeContents(source);
  const selection = getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
}

function flash(button: HTMLElement, message: string): void {
  // A client-side navigation replaces the body, taking this node with it.
  if (!status.isConnected) document.body.append(status);
  const label = button.querySelector<HTMLElement>("[data-copy-label]");
  const previous = label?.textContent ?? "";
  if (label) label.textContent = message;
  button.dataset.copyState = "done";
  // Icon-only buttons have no visible label to change, so the live region is what reports the
  // result in both cases.
  status.textContent = message;
  window.setTimeout(() => {
    if (label) label.textContent = previous;
    delete button.dataset.copyState;
    status.textContent = "";
  }, RESET_MS);
}

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-copy-button]");
  if (!button) return;
  const text = resolveText(button);
  if (!text) return;
  navigator.clipboard.writeText(text).then(
    () => flash(button, "Copied"),
    () => flash(button, selectSource(button) ? "Selected — press Ctrl+C" : "Copy failed"),
  );
});
