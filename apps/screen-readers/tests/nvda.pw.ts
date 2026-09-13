import { nvdaTest as test } from "@guidepup/playwright";
import { runTourScenario, SCREEN_READER_ADAPTERS } from "./scenario";

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
