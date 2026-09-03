import { expect, test } from "@playwright/test";

test("server-renders the tour markup before any client JS runs", async ({ baseURL }) => {
  if (!baseURL) {
    throw new Error("Playwright config is missing a baseURL");
  }
  const response = await fetch(baseURL);
  expect(response.ok).toBe(true);
  const html = await response.text();

  expect(html).toContain('id="tour-target"');
  expect(html).toContain('id="tour-trigger"');
  expect(html).toContain("data-glow-tour-root");
  expect(html).toContain("data-glow-tour-popover");
});

test("hydrates without console errors and stays interactive", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto("/");

  const trigger = page.locator("#tour-trigger");
  await expect(trigger).toBeVisible();

  // Give hydration a moment to complete and surface any async errors.
  await page.waitForTimeout(500);

  expect(pageErrors, `page errors during hydration: ${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `console errors during hydration: ${consoleErrors.join("\n")}`).toEqual([]);

  const popover = page.locator("[data-glow-tour-popover]");
  await expect(popover).toBeAttached();
  await expect(popover).toHaveAttribute("aria-hidden", "true");

  await trigger.click();
  await expect(popover).not.toHaveAttribute("aria-hidden", "true");
  await expect(popover).toContainText("Welcome");

  const advance = page.locator("[data-glow-tour-advance-trigger]");
  await advance.click();
  await expect(popover).toContainText("Trigger");

  expect(pageErrors, `page errors after interaction: ${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `console errors after interaction: ${consoleErrors.join("\n")}`).toEqual(
    [],
  );
});
