import { expect, test } from "@playwright/test";
import { BASE_URL } from "../playwright.config";

test.describe("Glow Tour SSR + hydration in a real Next.js app", () => {
  test("server-rendered HTML contains the target/trigger markup before any JS runs", async ({
    request,
  }) => {
    const response = await request.get(BASE_URL);
    expect(response.ok()).toBeTruthy();
    const html = await response.text();

    // The trigger and both step targets must already be present in the raw
    // SSR payload, proving the page doesn't rely on client-side rendering to
    // produce this markup.
    expect(html).toContain('id="start-tour-trigger"');
    expect(html).toContain('id="step-one-target"');
    expect(html).toContain('id="step-two-target"');
    // The tour root/popover markers from the packaged DefaultTour should
    // also be present in the SSR output.
    expect(html).toContain("data-glow-tour-root");
    expect(html).toContain("data-glow-tour-popover");
  });

  test("hydrates without console errors and becomes interactive", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.goto("/");

    // Let hydration settle before asserting on the console.
    await page.getByRole("button", { name: "Start tour" }).waitFor({ state: "visible" });

    const hydrationIssues = [...consoleErrors, ...pageErrors].filter((message) =>
      /hydrat/i.test(message),
    );
    expect(
      hydrationIssues,
      `Hydration-related console/page errors:\n${hydrationIssues.join("\n")}`,
    ).toEqual([]);
    expect(pageErrors, `Uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);

    // Before interaction: no active step content yet.
    const header = page.locator("[data-glow-tour-header]");
    await expect(header).toHaveText("");

    // Click the trigger: the tour should become visible on step one.
    await page.click("#start-tour-trigger");
    await expect(header).toHaveText("Step One");

    // Click advance: the tour should move to step two.
    const advanceTrigger = page.locator("[data-glow-tour-advance-trigger]");
    await advanceTrigger.click();
    await expect(header).toHaveText("Step Two");
    // On the last step the trigger relabels itself to "Finish tour".
    await expect(advanceTrigger).toHaveAccessibleName("Finish tour");

    // Click "Finish tour": the interaction must complete without error.
    await advanceTrigger.click();

    const finalHydrationIssues = [...consoleErrors, ...pageErrors].filter((message) =>
      /hydrat/i.test(message),
    );
    expect(finalHydrationIssues).toEqual([]);
    expect(pageErrors, `Uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  });
});
