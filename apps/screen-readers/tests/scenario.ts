import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { ADAPTERS, type AdapterName, STEP_TEXT } from "../src/fixture";

/** The Guidepup commands the scenario needs; VoiceOver and NVDA both implement them. */
export interface ScreenReaderDriver {
  navigateToWebContent(): Promise<void>;
  press(key: string): Promise<void>;
  next(): Promise<void>;
  spokenPhraseLog(): Promise<string[]>;
  clearSpokenPhraseLog(): Promise<void>;
}

/** `SCREEN_READER_ADAPTERS=react,vanilla` narrows a local run; CI covers every adapter. */
export const SCREEN_READER_ADAPTERS: readonly AdapterName[] = process.env.SCREEN_READER_ADAPTERS
  ? ADAPTERS.filter((name) => process.env.SCREEN_READER_ADAPTERS?.split(",").includes(name))
  : ADAPTERS;

const normalize = (value: string) => value.replace(/\s+/g, " ").toLowerCase();

/** Waits until the screen reader has spoken `text` since the last checkpoint. */
async function expectSpoken(driver: ScreenReaderDriver, text: string, timeout = 15_000) {
  await expect
    .poll(async () => normalize((await driver.spokenPhraseLog()).join(" ")), { timeout })
    .toContain(normalize(text));
}

/**
 * The user journey asserted on a real screen reader, with only keys a screen reader user presses
 * in its default mode (Enter on the focused control, the reading cursor, Escape). The full spoken
 * transcript is written to `transcripts/` as the compatibility evidence.
 */
export async function runTourScenario(
  page: Page,
  driver: ScreenReaderDriver,
  adapter: AdapterName,
  testInfo: TestInfo,
) {
  const transcript: string[] = [];
  const checkpoint = async (label: string) => {
    transcript.push(`## ${label}`, ...(await driver.spokenPhraseLog()), "");
    await driver.clearSpokenPhraseLog();
  };

  try {
    await page.goto(`/?adapter=${adapter}`, { waitUntil: "load" });
    await page.locator(`html[data-adapter="${adapter}"]`).waitFor({ state: "attached" });
    await driver.navigateToWebContent();
    // Reach the trigger through the screen reader, not Playwright: a DOM focus() moves neither
    // VoiceOver's nor NVDA's cursor, so their Enter would act on something else.
    // A document keeps its active element while the browser chrome has focus, so only count the
    // trigger as reached when the page itself is focused.
    const focusedId = () =>
      page.evaluate(() => (document.hasFocus() ? (document.activeElement?.id ?? "") : ""));
    // navigateToWebContent() can leave focus on the trigger without announcing it. Start from the
    // body so the next Tab lands on the trigger: Shift+Tab would leave the page for the browser
    // toolbar, as NVDA with Firefox showed.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    for (let tab = 0; tab < 10 && (await focusedId()) !== "start-tour"; tab += 1) {
      await driver.press("Tab");
    }
    expect(await focusedId(), "Tab through the screen reader never reached Start tour").toBe(
      "start-tour",
    );
    await expectSpoken(driver, "Start tour");
    await checkpoint("tabbed to Start tour");

    // Opening: focus enters the dialog, which is announced with its role and name.
    await driver.press("Enter");
    await expect(page.getByRole("dialog", { name: STEP_TEXT.welcome.title })).toBeVisible();
    await expectSpoken(driver, STEP_TEXT.welcome.title);
    await expectSpoken(driver, "dialog");
    await checkpoint("tour opened");

    // Advancing: the new step content is announced without moving the reading cursor.
    await driver.press("Enter");
    await expect(page.getByRole("dialog", { name: STEP_TEXT.field.title })).toBeVisible();
    await expectSpoken(driver, STEP_TEXT.field.content);
    await checkpoint("advanced to step 2");

    await driver.press("Enter");
    await expect(page.getByRole("dialog", { name: STEP_TEXT.finish.title })).toBeVisible();
    await expectSpoken(driver, STEP_TEXT.finish.content);
    await checkpoint("advanced to step 3");

    // Modal step: the reading cursor stays inside the dialog.
    for (let move = 0; move < 12; move += 1) await driver.next();
    const reading = normalize((await driver.spokenPhraseLog()).join(" "));
    expect(reading).not.toContain(normalize("Outside paragraph"));
    expect(reading).not.toContain(normalize("Start tour"));
    await checkpoint("reading cursor moved 12 times inside the modal dialog");

    // Escape closes the tour and focus returns to the trigger, which is announced.
    await driver.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start tour" })).toBeFocused();
    await expectSpoken(driver, "Start tour");
    await checkpoint("tour cancelled with Escape");
  } finally {
    // Keep what was spoken since the last checkpoint: on a failure it is the evidence.
    const pending = await driver.spokenPhraseLog().catch(() => []);
    if (pending.length > 0) transcript.push("## since last checkpoint", ...pending, "");
    const body = transcript.join("\n");
    await testInfo.attach("spoken-phrases.txt", { body, contentType: "text/plain" });
    const directory = join(testInfo.config.rootDir, "..", "transcripts");
    await mkdir(directory, { recursive: true });
    const name = `${testInfo.project.name}-${adapter}-attempt${testInfo.retry}.txt`;
    await writeFile(join(directory, `${testInfo.titlePath[1] ?? "screen-reader"}-${name}`), body);
  }
}
