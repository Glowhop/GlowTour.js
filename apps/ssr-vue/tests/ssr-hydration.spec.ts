import { expect, test } from "@playwright/test";

test("server renders target/trigger markup before any JS runs", async ({ baseURL }) => {
  const response = await fetch(baseURL as string);
  expect(response.ok).toBe(true);

  const html = await response.text();
  expect(html).toContain('id="tour-target"');
  expect(html).toContain("This is the tour target element.");
  expect(html).toContain('id="tour-trigger"');
  expect(html).toContain("Start tour");

  // The default tour popover markup is always present (for animation/layout), but the tour
  // has not been started yet, so its trigger buttons are disabled.
  expect(html).toContain("data-glow-tour-popover");
  expect(html).toContain("data-glow-tour-advance-trigger disabled");
});

test("hydrates without console errors/warnings and the tour is interactive", async ({ page }) => {
  const consoleIssues: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleIssues.push(`[${message.type()}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`[pageerror] ${error.message}`);
  });

  await page.goto("/");

  // Wait for hydration to complete: the button must become interactive.
  const trigger = page.locator("#tour-trigger");
  await expect(trigger).toBeVisible();

  // No hydration mismatch warnings (Vue logs these to the console) or other errors.
  const hydrationIssues = consoleIssues.filter(
    (entry) => /hydrat/i.test(entry) || /\[error\]/i.test(entry),
  );
  expect(hydrationIssues, `Unexpected console issues:\n${hydrationIssues.join("\n")}`).toEqual([]);

  // Interactivity: clicking the trigger starts the tour and shows step one.
  await trigger.click();
  const popover = page.locator("[data-glow-tour-popover]");
  await expect(popover).toBeVisible();
  await expect(page.locator("[data-glow-tour-header]")).toHaveText("Step one");

  // Advancing moves to step two.
  const advanceButton = page.locator("[data-glow-tour-advance-trigger]");
  await advanceButton.click();
  await expect(page.locator("[data-glow-tour-header]")).toHaveText("Step two");

  // Advancing again (finish) closes the tour: the popover becomes inert/hidden from a11y tree.
  await advanceButton.click();
  await expect(popover).toHaveAttribute("aria-hidden", "true");
  await expect(popover).toHaveAttribute("inert", "true");
});
