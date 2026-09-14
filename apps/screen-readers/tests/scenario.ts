import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { ADAPTERS, type AdapterName, STEP_TEXT } from "../src/fixture";

/** The Guidepup commands the scenario needs; VoiceOver and NVDA both implement them. */
export interface ScreenReaderDriver {
  navigateToWebContent(): Promise<void>;
  press(key: string): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  spokenPhraseLog(): Promise<string[]>;
  clearSpokenPhraseLog(): Promise<void>;
}

export interface ScenarioOptions {
  /**
   * Whether the phrase log can be checked for repeated or stale announcements. VoiceOver's log
   * starts each command with the tail of the previous one, so only NVDA's can.
   */
  strictRepetition: boolean;
}

type StepText = (typeof STEP_TEXT)[keyof typeof STEP_TEXT];

/** `SCREEN_READER_ADAPTERS=react,vanilla` narrows a local run; CI covers every adapter. */
export const SCREEN_READER_ADAPTERS: readonly AdapterName[] = process.env.SCREEN_READER_ADAPTERS
  ? ADAPTERS.filter((name) => process.env.SCREEN_READER_ADAPTERS?.split(",").includes(name))
  : ADAPTERS;

/** Page text a screen reader must never reach while a step is modal. */
const OUTSIDE_TEXT = ["Outside paragraph", "Screen reader fixture", "Start tour", "Finish area"];

const TIMEOUT = 15_000;

const normalize = (value: string) => value.replace(/\s+/g, " ").toLowerCase();

const spokenText = async (driver: ScreenReaderDriver) =>
  normalize((await driver.spokenPhraseLog()).join(" "));

const occurrences = (spoken: string, text: string) => spoken.split(normalize(text)).length - 1;

/** Waits until the screen reader has spoken `text` since the last checkpoint. */
async function expectSpoken(driver: ScreenReaderDriver, text: string) {
  await expect.poll(() => spokenText(driver), { timeout: TIMEOUT }).toContain(normalize(text));
}

/** Waits until the screen reader has spoken one of `texts` since the last checkpoint. */
async function expectSpokenAny(driver: ScreenReaderDriver, texts: readonly string[]) {
  await expect
    .poll(
      async () => {
        const spoken = await spokenText(driver);
        return texts.some((text) => spoken.includes(normalize(text)));
      },
      { timeout: TIMEOUT },
    )
    .toBe(true);
}

/**
 * A step change announces the new content through the popover's live region. The title is not a
 * live region: two regions updated together are not both read by VoiceOver (w3c/aria#1689), and
 * the title stays reachable with the reading cursor. With a log that can be trusted for
 * repetitions, the content is read once and the previous step's content is not read again.
 *
 * `focusedControlChangesState` marks a step change that makes the focused button unavailable
 * (Back, on the way to the first step): NVDA then re-announces the focus with its dialog context,
 * description included, before focus moves on (nvaccess/nvda#6265), so the content can be read
 * twice there. VoiceOver instead drops the live region announcement while it describes focus
 * moving to Advance (Apple Developer Forums thread 118761); the content must then still be
 * reachable with the reading cursor.
 */
async function expectStepAnnounced(
  page: Page,
  driver: ScreenReaderDriver,
  step: StepText,
  previous: StepText,
  options: ScenarioOptions,
  { focusedControlChangesState = false } = {},
) {
  if (focusedControlChangesState && !options.strictRepetition) {
    const announced = await expectSpoken(driver, step.content).then(
      () => true,
      () => false,
    );
    if (!announced) {
      for (let move = 0; move < 6; move += 1) await driver.previous();
      await expectSpoken(driver, step.content);
    }
    return;
  }
  await expectSpoken(driver, step.content);
  if (!options.strictRepetition) return;
  // Late duplicates arrive after the first announcement: give them time to show up.
  await page.waitForTimeout(1_500);
  const settled = await spokenText(driver);
  if (!focusedControlChangesState) {
    expect(occurrences(settled, step.content), "the step content is read once").toBe(1);
  }
  expect(settled, "the previous step's content is not read again").not.toContain(
    normalize(previous.content),
  );
}

/**
 * The user journeys asserted on a real screen reader, with only keys a screen reader user presses
 * in its default mode (Tab, Shift+Tab, Enter, Escape, the reading cursor). The full spoken
 * transcript is written to `transcripts/` as the compatibility evidence.
 */
export async function runTourScenario(
  page: Page,
  driver: ScreenReaderDriver,
  adapter: AdapterName,
  testInfo: TestInfo,
  options: ScenarioOptions,
) {
  const transcript: string[] = [];
  const checkpoint = async (label: string) => {
    transcript.push(`## ${label}`, ...(await driver.spokenPhraseLog()), "");
    await driver.clearSpokenPhraseLog();
  };
  const dialog = (step: StepText) => page.getByRole("dialog", { name: step.title });
  const startTour = page.getByRole("button", { name: "Start tour" });
  // A document keeps its active element while the browser chrome has focus, so only count an
  // element as focused when the page itself is focused.
  const focused = (selector: string) =>
    page.evaluate(
      (target) => document.hasFocus() && document.activeElement?.matches(target) === true,
      selector,
    );
  /** Moves focus with the screen reader's own keys until `selector` is focused. */
  const pressUntilFocused = async (key: string, selector: string, label: string) => {
    for (let press = 0; press < 10 && !(await focused(selector)); press += 1) {
      await driver.press(key);
    }
    expect(await focused(selector), label).toBe(true);
  };

  try {
    await page.goto(`/?adapter=${adapter}`, { waitUntil: "load" });
    await page.locator(`html[data-adapter="${adapter}"]`).waitFor({ state: "attached" });
    await driver.navigateToWebContent();
    // Reach the trigger through the screen reader, not Playwright: a DOM focus() moves neither
    // VoiceOver's nor NVDA's cursor. navigateToWebContent() can leave focus on the trigger without
    // announcing it, so start from the body; Shift+Tab would leave the page for the browser
    // toolbar, as NVDA with Firefox showed.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    for (let tab = 0; tab < 10 && !(await focused("#start-tour")); tab += 1) {
      await driver.press("Tab");
    }
    if (!(await focused("#start-tour"))) {
      // NVDA with Firefox occasionally leaves focus in the browser chrome after the first
      // navigation, where Tab never reaches the page: navigate into the web content once more.
      await driver.navigateToWebContent();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    }
    await pressUntilFocused(
      "Tab",
      "#start-tour",
      "Tab through the screen reader reaches Start tour",
    );
    await expectSpoken(driver, "Start tour");
    await checkpoint("tabbed to Start tour");

    // Opening: focus enters the dialog, which is announced with its role and title. NVDA also
    // reads the description; VoiceOver leaves it to the reading cursor, checked further down.
    await driver.press("Enter");
    await expect(dialog(STEP_TEXT.welcome)).toBeVisible();
    await expectSpoken(driver, STEP_TEXT.welcome.title);
    await expectSpoken(driver, "dialog");
    if (options.strictRepetition) await expectSpoken(driver, STEP_TEXT.welcome.content);
    await checkpoint("tour opened");

    // Advancing announces the new title, then its content.
    await driver.press("Enter");
    await expect(dialog(STEP_TEXT.field)).toBeVisible();
    await expectStepAnnounced(page, driver, STEP_TEXT.field, STEP_TEXT.welcome, options);
    await checkpoint("advanced to step 2");

    // Going back with the Back button announces the previous step the same way.
    await pressUntilFocused(
      "Shift+Tab",
      "[data-glow-tour-previous-trigger]",
      "Shift+Tab reaches the Back button",
    );
    // VoiceOver sometimes speaks only the button's shortcut hint when focus moves between buttons.
    await expectSpokenAny(driver, ["Back step", "ArrowLeft Backspace"]);
    await checkpoint("moved to the Back button");
    await driver.press("Enter");
    await expect(dialog(STEP_TEXT.welcome)).toBeVisible();
    await expectStepAnnounced(page, driver, STEP_TEXT.welcome, STEP_TEXT.field, options, {
      focusedControlChangesState: true,
    });
    await checkpoint("went back to step 1");

    // Forward again to the last step.
    await pressUntilFocused(
      "Shift+Tab",
      "[data-glow-tour-advance-trigger]",
      "Shift+Tab reaches the Advance button",
    );
    await checkpoint("moved to the Advance button");
    await driver.press("Enter");
    await expect(dialog(STEP_TEXT.field)).toBeVisible();
    await expectSpoken(driver, STEP_TEXT.field.content);
    await checkpoint("advanced to step 2 again");
    await driver.press("Enter");
    await expect(dialog(STEP_TEXT.finish)).toBeVisible();
    await expectStepAnnounced(page, driver, STEP_TEXT.finish, STEP_TEXT.field, options);
    await checkpoint("advanced to step 3");

    // Modal step: reading backwards from the focused button reaches the step's text and never
    // leaves the dialog.
    for (let move = 0; move < 10; move += 1) await driver.previous();
    const reading = await spokenText(driver);
    expect(reading, "the reading cursor reaches the step title").toContain(
      normalize(STEP_TEXT.finish.title),
    );
    expect(reading, "the reading cursor reaches the step content").toContain(
      normalize(STEP_TEXT.finish.content),
    );
    for (const outside of OUTSIDE_TEXT) {
      expect(reading, `the reading cursor stays out of "${outside}"`).not.toContain(
        normalize(outside),
      );
    }
    await checkpoint("reading cursor moved 10 times backwards inside the modal dialog");

    // Escape closes the tour and focus returns to the trigger, which is announced.
    await driver.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(startTour).toBeFocused({ timeout: TIMEOUT });
    await expectSpoken(driver, "Start tour");
    await checkpoint("tour cancelled with Escape");

    // Reopen from the restored focus and finish with Enter on the last step.
    await driver.press("Enter");
    await expect(dialog(STEP_TEXT.welcome)).toBeVisible();
    await expectSpoken(driver, STEP_TEXT.welcome.title);
    await checkpoint("tour reopened");
    await driver.press("Enter");
    await expect(dialog(STEP_TEXT.field)).toBeVisible();
    await driver.press("Enter");
    await expect(dialog(STEP_TEXT.finish)).toBeVisible();
    await expectSpoken(driver, STEP_TEXT.finish.content);
    await checkpoint("advanced to the last step");
    await driver.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(startTour).toBeFocused({ timeout: TIMEOUT });
    await expectSpoken(driver, "Start tour");
    await checkpoint("tour finished with Enter");
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
