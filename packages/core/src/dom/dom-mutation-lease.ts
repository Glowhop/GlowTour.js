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
    const mutation = this.styles.get(name);

    if (value === null) {
      if (mutation) {
        this.element.style.removeProperty(name);
        mutation.value = this.element.style.getPropertyValue(name);
        mutation.priority = this.element.style.getPropertyPriority(name);
      } else {
        const firstMutation = this.styleMutation(name);
        this.element.style.removeProperty(name);
        firstMutation.value = this.element.style.getPropertyValue(name);
        firstMutation.priority = this.element.style.getPropertyPriority(name);
        this.styles.set(name, firstMutation);
      }
      return;
    }

    const accepted = isStyleDeclarationAccepted(this.element, name, value, priority);
    if (mutation) {
      this.element.style.setProperty(name, value, priority);
      if (!accepted) return;
      mutation.value = this.element.style.getPropertyValue(name);
      mutation.priority = this.element.style.getPropertyPriority(name);
      return;
    }

    const firstMutation = this.styleMutation(name);
    this.element.style.setProperty(name, value, priority);
    if (!accepted) return;
    firstMutation.value = this.element.style.getPropertyValue(name);
    firstMutation.priority = this.element.style.getPropertyPriority(name);
    this.styles.set(name, firstMutation);
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

  private styleMutation(name: string): StyleMutation {
    const original = this.element.style.getPropertyValue(name);
    return {
      original: original === "" ? null : original,
      originalPriority: this.element.style.getPropertyPriority(name),
      priority: this.element.style.getPropertyPriority(name),
      value: original,
    };
  }
}

function isStyleDeclarationAccepted(
  element: HTMLElement | SVGElement,
  name: string,
  value: string,
  priority: string,
) {
  const probe = element.ownerDocument.createElement("div");
  probe.style.setProperty(name, value, priority);
  return value === "" || probe.style.getPropertyValue(name) !== "";
}
