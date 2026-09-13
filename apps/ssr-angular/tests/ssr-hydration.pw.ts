import { expect, test } from "@playwright/test";

test("server renders target/trigger and tour markup before any JS runs", async ({ baseURL }) => {
  const response = await fetch(baseURL as string);
  expect(response.ok).toBe(true);

  const html = await response.text();
  expect(html).toContain('id="tour-target"');
  expect(html).toContain("This is the tour target element.");
  expect(html).toContain('id="tour-trigger"');
  expect(html).toContain("Start tour");

  // The default tour popover markup is always present, even before the tour starts.
  expect(html).toContain("data-glow-tour-popover");
  expect(html).toContain("data-glow-tour-advance-trigger");

  // `ngh` annotations are only emitted when client hydration is enabled: without them the
  // browser would re-render from scratch and a mismatch could never surface below.
  expect(html).toContain('ng-server-context="ssr"');
  expect(html).toMatch(/\sngh="\d+"/);
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

  const trigger = page.locator("#tour-trigger");
  await expect(trigger).toBeVisible();
  await trigger.click();
  const popover = page.locator("[data-glow-tour-popover]");
  await expect(popover).toBeVisible();
  await expect(page.locator("[data-glow-tour-header]")).toHaveText("Step one");

  const advanceButton = page.locator("[data-glow-tour-advance-trigger]");
  await advanceButton.click();
  await expect(page.locator("[data-glow-tour-header]")).toHaveText("Step two");

  // Finishing closes the tour: the popover leaves the accessibility tree.
  await advanceButton.click();
  await expect(popover).toHaveAttribute("aria-hidden", "true");
  await expect(popover).toHaveAttribute("inert");

  // Checked last so hydration has long finished: mismatches surface as NG05xx console errors.
  expect(consoleIssues, `Unexpected console issues:\n${consoleIssues.join("\n")}`).toEqual([]);
});
