import { nvdaTest as test } from "@guidepup/playwright";
import { runTourScenario, SCREEN_READER_ADAPTERS } from "./scenario";

// The default "initial" capture only logs what is spoken right after each command. The dialog
// opening, live region updates and restored focus are announced later, so capture everything.
test.use({ nvdaStartOptions: { capture: true } });

test.describe("nvda", () => {
  for (const adapter of SCREEN_READER_ADAPTERS) {
    test(`${adapter}: tour is operable and announced with NVDA`, async ({
      page,
      nvda,
    }, testInfo) => {
      await runTourScenario(page, nvda, adapter, testInfo);
    });
  }
});
