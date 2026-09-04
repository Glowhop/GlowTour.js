import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { ScrollLock } from "./scroll-lock";

function createFakeDocument(
  options: {
    bodyOverflow?: string;
    bodyPaddingRight?: string;
    innerWidth?: number;
    clientWidth?: number;
    computedPaddingRight?: string;
  } = {},
) {
  const body = {
    style: {
      overflow: options.bodyOverflow ?? "",
      paddingRight: options.bodyPaddingRight ?? "",
    },
  };
  const documentElement = {
    clientWidth: options.clientWidth ?? 800,
  };
  const defaultView = {
    innerWidth: options.innerWidth ?? 800,
    getComputedStyle: () => ({
      paddingRight: options.computedPaddingRight ?? "0px",
    }),
  };
  return {
    body,
    defaultView,
    documentElement,
  } as unknown as Document;
}

describe("ScrollLock", () => {
  test("locks body scroll by default", () => {
    const lock = new ScrollLock();
    const document = createFakeDocument();

    lock.activate(document);

    assert.equal(document.body.style.overflow, "hidden");
  });

  test("compensates for scrollbar width to avoid layout shift", () => {
    const lock = new ScrollLock();
    const document = createFakeDocument({ innerWidth: 815, clientWidth: 800 });

    lock.activate(document);

    assert.equal(document.body.style.paddingRight, "15px");
  });

  test("adds scrollbar compensation on top of existing computed padding", () => {
    const lock = new ScrollLock();
    const document = createFakeDocument({
      innerWidth: 815,
      clientWidth: 800,
      computedPaddingRight: "10px",
    });

    lock.activate(document);

    assert.equal(document.body.style.paddingRight, "25px");
  });

  test("does nothing when there is no scrollbar width difference", () => {
    const lock = new ScrollLock();
    const document = createFakeDocument({ innerWidth: 800, clientWidth: 800 });

    lock.activate(document);

    assert.equal(document.body.style.overflow, "hidden");
    assert.equal(document.body.style.paddingRight, "");
  });

  test("does nothing when no document is provided", () => {
    const lock = new ScrollLock();

    lock.activate(undefined);
    lock.activate(null);

    // No throw, and nothing to assert on since no document was touched.
  });

  test("restores the original overflow and padding on deactivate", () => {
    const lock = new ScrollLock();
    const document = createFakeDocument({
      bodyOverflow: "auto",
      bodyPaddingRight: "4px",
      innerWidth: 815,
      clientWidth: 800,
    });

    lock.activate(document);
    assert.equal(document.body.style.overflow, "hidden");

    lock.deactivate();

    assert.equal(document.body.style.overflow, "auto");
    assert.equal(document.body.style.paddingRight, "4px");
  });

  test("restores empty inline styles when none were previously set", () => {
    const lock = new ScrollLock();
    const document = createFakeDocument();

    lock.activate(document);
    lock.deactivate();

    assert.equal(document.body.style.overflow, "");
    assert.equal(document.body.style.paddingRight, "");
  });

  test("deactivate is a no-op when never activated", () => {
    const lock = new ScrollLock();

    lock.deactivate();
    lock.deactivate();
  });

  test("activating twice without deactivating is idempotent", () => {
    const lock = new ScrollLock();
    const document = createFakeDocument({ bodyOverflow: "scroll" });

    lock.activate(document);
    document.body.style.overflow = "hidden";
    lock.activate(document);
    lock.deactivate();

    assert.equal(document.body.style.overflow, "scroll");
  });
});
