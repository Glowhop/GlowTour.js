import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { DomMutationLease } from "./dom-mutation-lease";

function element() {
  return new Window().document.createElement("div") as unknown as HTMLElement;
}

describe("DomMutationLease", () => {
  test("restores original attributes and important styles while it still owns them", () => {
    const target = element();
    target.setAttribute("aria-label", "Original label");
    target.style.setProperty("color", "red", "important");
    const lease = new DomMutationLease(target);

    lease.setAttribute("aria-label", "Tour label");
    lease.setStyle("color", "blue");
    lease.release();

    assert.equal(target.getAttribute("aria-label"), "Original label");
    assert.equal(target.style.getPropertyValue("color"), "red");
    assert.equal(target.style.getPropertyPriority("color"), "important");
  });

  test("removes initially absent attributes and styles while it still owns them", () => {
    const target = element();
    const lease = new DomMutationLease(target);

    lease.setAttribute("aria-hidden", "true");
    lease.setStyle("opacity", "0.4");
    lease.release();

    assert.equal(target.getAttribute("aria-hidden"), null);
    assert.equal(target.style.getPropertyValue("opacity"), "");
    assert.equal(target.style.getPropertyPriority("opacity"), "");
  });

  test("preserves consumer attribute and style changes after a Core write", () => {
    const target = element();
    target.setAttribute("role", "region");
    target.style.setProperty("display", "block");
    const lease = new DomMutationLease(target);

    lease.setAttribute("role", "dialog");
    lease.setStyle("display", "none");
    target.setAttribute("role", "alertdialog");
    target.style.setProperty("display", "none", "important");
    lease.release();

    assert.equal(target.getAttribute("role"), "alertdialog");
    assert.equal(target.style.getPropertyValue("display"), "none");
    assert.equal(target.style.getPropertyPriority("display"), "important");
  });

  test("recognizes its latest write while restoring the first attribute and style snapshots", () => {
    const target = element();
    target.setAttribute("data-state", "consumer");
    target.style.setProperty("z-index", "10", "important");
    const lease = new DomMutationLease(target);

    lease.setAttribute("data-state", "first");
    lease.setStyle("z-index", "20");
    lease.setAttribute("data-state", "latest");
    lease.setStyle("z-index", "30", "important");
    lease.release();

    assert.equal(target.getAttribute("data-state"), "consumer");
    assert.equal(target.style.getPropertyValue("z-index"), "10");
    assert.equal(target.style.getPropertyPriority("z-index"), "important");
  });

  test("restores initial values after Core-owned attribute and style removals", () => {
    const target = element();
    target.setAttribute("title", "Consumer title");
    target.style.setProperty("margin-top", "12px", "important");
    const lease = new DomMutationLease(target);

    lease.setAttribute("title", null);
    lease.setStyle("margin-top", null);
    lease.release();

    assert.equal(target.getAttribute("title"), "Consumer title");
    assert.equal(target.style.getPropertyValue("margin-top"), "12px");
    assert.equal(target.style.getPropertyPriority("margin-top"), "important");
  });

  test("restores styles after CSSOM normalizes a Core value", () => {
    const target = element();
    target.style.setProperty("color", "blue");
    const lease = new DomMutationLease(target);

    lease.setStyle("color", "RED");
    assert.equal(target.style.getPropertyValue("color"), "red");
    assert.equal(target.style.getPropertyPriority("color"), "");
    lease.release();

    assert.equal(target.style.getPropertyValue("color"), "blue");
    assert.equal(target.style.getPropertyPriority("color"), "");
  });

  test("preserves a consumer style after Core writes with an invalid priority", () => {
    const target = element();
    target.style.setProperty("color", "red");
    const lease = new DomMutationLease(target);

    lease.setStyle("color", "blue");
    target.style.setProperty("color", "green");
    lease.setStyle("color", "yellow", "bogus");
    assert.equal(target.style.getPropertyValue("color"), "green");
    lease.release();

    assert.equal(target.style.getPropertyValue("color"), "green");
  });

  test("preserves a consumer style after Core writes an invalid value", () => {
    const target = element();
    target.style.setProperty("color", "red");
    const lease = new DomMutationLease(target);

    lease.setStyle("color", "blue");
    target.style.setProperty("color", "green");
    lease.setStyle("color", "not-a-color");
    assert.equal(target.style.getPropertyValue("color"), "green");
    lease.release();

    assert.equal(target.style.getPropertyValue("color"), "green");
  });

  test("continues restoring later mutations when one restoration throws", () => {
    const target = element();
    target.setAttribute("aria-label", "Original label");
    target.setAttribute("title", "Original title");
    const lease = new DomMutationLease(target);

    lease.setAttribute("aria-label", "Tour label");
    lease.setAttribute("title", "Tour title");
    const setAttribute = target.setAttribute.bind(target);
    target.setAttribute = (name, value) => {
      if (name === "aria-label" && value === "Original label") {
        throw new Error("consumer setter failed");
      }
      setAttribute(name, value);
    };

    assert.throws(() => lease.release(), /consumer setter failed/);
    assert.equal(target.getAttribute("title"), "Original title");
  });

  test("ignores repeated release and post-release mutation calls", () => {
    const target = element();
    target.setAttribute("title", "Consumer title");
    target.style.setProperty("margin-top", "12px");
    const lease = new DomMutationLease(target);

    lease.setAttribute("title", "Tour title");
    lease.setStyle("margin-top", "4px", "important");
    lease.release();
    lease.release();
    lease.setAttribute("title", "Late write");
    lease.setStyle("margin-top", "0px");

    assert.equal(target.getAttribute("title"), "Consumer title");
    assert.equal(target.style.getPropertyValue("margin-top"), "12px");
    assert.equal(target.style.getPropertyPriority("margin-top"), "");
  });
});
