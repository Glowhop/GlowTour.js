import { expect, type Locator, type Page, test } from "@playwright/test";
import { ADAPTERS, type AdapterName, STEP_TEXT } from "../src/fixture";

async function openFixture(page: Page, adapter: AdapterName) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`/?adapter=${adapter}`);
  await expect(page.locator(`html[data-adapter="${adapter}"]`)).toBeAttached();
  return errors;
}

/** Starts the tour from the keyboard, the way a screen reader user does. */
async function startTour(page: Page) {
  await page.getByRole("button", { name: "Start tour" }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: STEP_TEXT.welcome.title });
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Waits for the popover's step transition to end. A click during the fade is ignored by design
 * (the controller is transitioning), while a real user acts on the settled popover.
 */
async function waitForSettledPopover(page: Page) {
  await expect
    .poll(() =>
      page.locator("[data-glow-tour-popover]").evaluate(
        // Finished animations stay listed because they fill forwards: look for running ones.
        (popover) =>
          popover.getAnimations().every((animation) => animation.playState !== "running") &&
          getComputedStyle(popover).opacity === "1",
      ),
    )
    .toBe(true);
}

function isExcludedFromAccessibilityTree(locator: Locator) {
  return locator.evaluate((element) => element.closest("[inert], [aria-hidden='true']") !== null);
}

async function expectFocusInside(dialog: Locator) {
  await expect
    .poll(() => dialog.evaluate((element) => element.contains(element.ownerDocument.activeElement)))
    .toBe(true);
}

for (const adapter of ADAPTERS) {
  test.describe(`${adapter} adapter`, () => {
    test("exposes nothing to assistive technology before the tour starts", async ({ page }) => {
      const errors = await openFixture(page, adapter);

      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Start tour" })).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("opens a named, described modal dialog and moves focus into it", async ({ page }) => {
      const errors = await openFixture(page, adapter);
      const dialog = await startTour(page);

      await expect(dialog).toHaveAccessibleDescription(STEP_TEXT.welcome.content);
      await expect(dialog).toHaveAttribute("aria-modal", "true");
      await expectFocusInside(dialog);

      // The rest of the page leaves the accessibility tree while the step is modal. Checked on the
      // DOM because Playwright's role queries ignore `inert`; the native tree is checked below.
      for (const outside of [
        page.getByRole("button", { name: "Start tour" }),
        page.getByRole("textbox", { name: "Your name" }),
      ]) {
        await expect.poll(() => isExcludedFromAccessibilityTree(outside)).toBe(true);
      }

      // Decorative layers are never exposed.
      await expect(page.locator("[data-glow-tour-pointer]")).toHaveAttribute("aria-hidden", "true");
      await expect(page.locator("[data-glow-tour-overlay]").first()).toHaveAttribute(
        "aria-hidden",
        "true",
      );

      // Every control has a name.
      for (const trigger of await dialog.getByRole("button").all()) {
        await expect(trigger).toHaveAccessibleName(/\S/);
      }
      expect(errors).toEqual([]);
    });

    test("keeps only the dialog in Chromium's native accessibility tree on a modal step", async ({
      browserName,
      page,
    }) => {
      test.skip(browserName !== "chromium", "Reads the tree through the Chrome DevTools Protocol");
      const errors = await openFixture(page, adapter);
      const dialog = await startTour(page);
      await expectFocusInside(dialog);

      const session = await page.context().newCDPSession(page);
      const { nodes } = await session.send("Accessibility.getFullAXTree");
      const exposed = nodes
        .filter((node) => !node.ignored && node.name?.value)
        .map((node) => `${node.role?.value}: ${node.name?.value}`);

      expect(exposed).toContain(`dialog: ${STEP_TEXT.welcome.title}`);
      expect(
        exposed.filter((entry) =>
          /Start tour|Your name|Outside paragraph|Screen reader fixture/.test(entry),
        ),
      ).toEqual([]);
      expect(errors).toEqual([]);
    });

    test("announces the title and content through persistent live regions", async ({ page }) => {
      const errors = await openFixture(page, adapter);
      const dialog = await startTour(page);

      // The title and the content are the dialog's name and description. Only the content is a
      // polite live region: VoiceOver reads a single one of two regions updated together.
      const title = page.locator(`[id="${await dialog.getAttribute("aria-labelledby")}"]`);
      const content = page.locator(`[id="${await dialog.getAttribute("aria-describedby")}"]`);
      await expect(title).not.toHaveAttribute("aria-live");
      await expect(content).toHaveAttribute("aria-live", "polite");
      await expect(title).toHaveText(STEP_TEXT.welcome.title);
      await expect(content).toHaveText(STEP_TEXT.welcome.content);
      // A live region is only announced if the node persists: mark both, then change step.
      await title.evaluate((element) => element.setAttribute("data-probe", ""));
      await content.evaluate((element) => element.setAttribute("data-probe", ""));
      // Screen readers ignore a live region that changes inside a hidden subtree, lose their place
      // when focus leaves the dialog, and re-read a region rewritten with the same text: record
      // all three during the transition.
      await dialog.evaluate((popover) => {
        const record = { changedWhileHidden: false, focusLeftDialog: false, rewrites: 0 };
        Object.assign(window, { __transition: record });
        for (const region of Array.from(popover.querySelectorAll("[data-probe]"))) {
          let text = region.textContent;
          new MutationObserver(() => {
            if (region.closest("[aria-hidden='true'], [inert]")) record.changedWhileHidden = true;
            if (region.textContent === text) record.rewrites += 1;
            text = region.textContent;
          }).observe(region, { characterData: true, childList: true, subtree: true });
        }
        popover.addEventListener("focusout", (event) => {
          const next = (event as FocusEvent).relatedTarget as Node | null;
          if (!popover.contains(next)) record.focusLeftDialog = true;
        });
      });

      await page.keyboard.press("ArrowRight");

      const fieldDialog = page.getByRole("dialog", { name: STEP_TEXT.field.title });
      await expect(fieldDialog).toBeVisible();
      await expect(title).toHaveAttribute("data-probe", "");
      await expect(content).toHaveAttribute("data-probe", "");
      await expect(title).toHaveText(STEP_TEXT.field.title);
      await expect(content).toHaveText(STEP_TEXT.field.content);
      await expect(fieldDialog).toHaveAccessibleDescription(STEP_TEXT.field.content);
      await waitForSettledPopover(page);
      const transition = await page.evaluate(
        () => (window as unknown as { __transition: Record<string, unknown> }).__transition,
      );
      expect(transition).toEqual({
        changedWhileHidden: false,
        focusLeftDialog: false,
        rewrites: 0,
      });
      expect(errors).toEqual([]);
    });

    test("activates the focused Back and Skip buttons with Enter", async ({ page }) => {
      const errors = await openFixture(page, adapter);
      await startTour(page);
      await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("dialog", { name: STEP_TEXT.field.title })).toBeVisible();
      await waitForSettledPopover(page);

      // Enter on a focused Back button goes back; it used to be read as "next".
      await page.locator("button[data-glow-tour-previous-trigger]").focus();
      await page.keyboard.press("Enter");
      const welcome = page.getByRole("dialog", { name: STEP_TEXT.welcome.title });
      await expect(welcome).toBeVisible();
      await waitForSettledPopover(page);
      // Back is unavailable on the first step, so focus lands on Advance rather than on it.
      await expect(page.locator("button[data-glow-tour-advance-trigger]")).toBeFocused();

      await page.locator("button[data-glow-tour-cancel-trigger]").focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Start tour" })).toBeFocused();
      expect(errors).toEqual([]);
    });

    test("leaves the page reachable on a step that allows target interaction", async ({ page }) => {
      const errors = await openFixture(page, adapter);
      await startTour(page);
      await page.keyboard.press("ArrowRight");

      const dialog = page.getByRole("dialog", { name: STEP_TEXT.field.title });
      await expect(dialog).toBeVisible();
      await expect(dialog).not.toHaveAttribute("aria-modal", "true");
      await expect(page.getByRole("textbox", { name: "Your name" })).toHaveCount(1);
      expect(errors).toEqual([]);
    });

    test("navigates with Enter, arrows and Escape, then restores focus", async ({ page }) => {
      const errors = await openFixture(page, adapter);
      const dialog = await startTour(page);
      await expectFocusInside(dialog);

      await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("dialog", { name: STEP_TEXT.field.title })).toBeVisible();

      await page.keyboard.press("ArrowLeft");
      await expect(page.getByRole("dialog", { name: STEP_TEXT.welcome.title })).toBeVisible();

      // Enter on the focused Advance trigger must move exactly one step.
      await page.keyboard.press("ArrowRight");
      const fieldDialog = page.getByRole("dialog", { name: STEP_TEXT.field.title });
      await expect(fieldDialog).toBeVisible();
      await expectFocusInside(fieldDialog);
      await page.keyboard.press("Enter");
      const finishDialog = page.getByRole("dialog", { name: STEP_TEXT.finish.title });
      await expect(finishDialog).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Start tour" })).toBeFocused();
      expect(errors).toEqual([]);
    });

    test("restores focus to the trigger when the tour finishes", async ({ page }) => {
      const errors = await openFixture(page, adapter);
      await startTour(page);

      for (const step of [STEP_TEXT.field, STEP_TEXT.finish]) {
        await waitForSettledPopover(page);
        await page.locator("[data-glow-tour-advance-trigger]").click();
        await expect(page.getByRole("dialog", { name: step.title })).toBeVisible();
      }
      await waitForSettledPopover(page);
      await page.locator("[data-glow-tour-advance-trigger]").click();

      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Start tour" })).toBeFocused();
      expect(errors).toEqual([]);
    });
  });
}
