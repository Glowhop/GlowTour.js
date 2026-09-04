/**
 * Locks page scroll on `document.body` while a tour is active, compensating
 * for the scrollbar's width so hiding it does not shift the layout.
 *
 * Mirrors the setup/teardown shape of {@link "./focus-guard".FocusGuard}:
 * `activate` captures and overrides the body's inline scroll-affecting
 * styles, `deactivate` restores exactly what was there before.
 */
export class ScrollLock {
  private document: Document | null = null;
  private previousOverflow = "";
  private previousPaddingRight = "";
  private active = false;

  activate(document: Document | null | undefined): void {
    if (this.active || !document) return;
    const body = document.body;
    if (!body?.style) return;

    this.document = document;
    this.previousOverflow = body.style.overflow;
    this.previousPaddingRight = body.style.paddingRight;
    this.active = true;

    body.style.overflow = "hidden";
    const scrollbarWidth = this.scrollbarWidth(document);
    if (scrollbarWidth > 0) {
      const currentPaddingRight = this.computedPaddingRight(document, body);
      body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
    }
  }

  deactivate(): void {
    if (!this.active) return;
    const body = this.document?.body;
    this.active = false;
    this.document = null;
    if (!body?.style) return;

    body.style.overflow = this.previousOverflow;
    body.style.paddingRight = this.previousPaddingRight;
    this.previousOverflow = "";
    this.previousPaddingRight = "";
  }

  private scrollbarWidth(document: Document): number {
    const view = document.defaultView;
    const documentElement = document.documentElement;
    if (!view || !documentElement) return 0;
    const width = view.innerWidth - documentElement.clientWidth;
    return Number.isFinite(width) && width > 0 ? width : 0;
  }

  private computedPaddingRight(document: Document, body: HTMLElement): number {
    const view = document.defaultView;
    if (typeof view?.getComputedStyle !== "function") return 0;
    const value = Number.parseFloat(view.getComputedStyle(body).paddingRight || "0");
    return Number.isFinite(value) ? value : 0;
  }
}
