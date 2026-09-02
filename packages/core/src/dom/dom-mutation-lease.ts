interface AttributeMutation {
  readonly original: string | null;
  value: string | null;
}

interface StyleMutation {
  readonly original: string | null;
  readonly originalPriority: string;
  priority: string;
  value: string | null;
}

export class DomMutationLease {
  private readonly attributes = new Map<string, AttributeMutation>();
  private readonly styles = new Map<string, StyleMutation>();
  private released = false;

  constructor(private readonly element: HTMLElement | SVGElement) {}

  setAttribute(name: string, value: string | null) {
    if (this.released) return;
    const mutation = this.attributes.get(name);
    if (mutation) mutation.value = value;
    else this.attributes.set(name, { original: this.element.getAttribute(name), value });

    if (value === null) this.element.removeAttribute(name);
    else this.element.setAttribute(name, value);
  }

  setStyle(name: string, value: string | null, priority = "") {
    if (this.released) return;
    let mutation = this.styles.get(name);
    if (!mutation) {
      const original = this.element.style.getPropertyValue(name);
      mutation = {
        original: original === "" ? null : original,
        originalPriority: this.element.style.getPropertyPriority(name),
        priority: "",
        value: null,
      };
      this.styles.set(name, mutation);
    }

    if (value === null) this.element.style.removeProperty(name);
    else this.element.style.setProperty(name, value, priority);
    mutation.value = this.element.style.getPropertyValue(name);
    mutation.priority = this.element.style.getPropertyPriority(name);
  }

  release() {
    if (this.released) return;
    this.released = true;
    let failed = false;
    let failure: unknown;

    for (const [name, mutation] of this.attributes) {
      try {
        if (this.element.getAttribute(name) !== mutation.value) continue;
        if (mutation.original === null) this.element.removeAttribute(name);
        else this.element.setAttribute(name, mutation.original);
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
      }
    }

    for (const [name, mutation] of this.styles) {
      try {
        if (
          this.element.style.getPropertyValue(name) !== (mutation.value ?? "") ||
          this.element.style.getPropertyPriority(name) !== mutation.priority
        ) {
          continue;
        }
        if (mutation.original === null) this.element.style.removeProperty(name);
        else this.element.style.setProperty(name, mutation.original, mutation.originalPriority);
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
      }
    }

    if (failed) throw failure;
  }
}
