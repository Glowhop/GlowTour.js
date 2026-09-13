import { voiceOverTest as test } from "@guidepup/playwright";
import { runTourScenario, SCREEN_READER_ADAPTERS } from "./scenario";

test.describe("voiceover", () => {
  for (const adapter of SCREEN_READER_ADAPTERS) {
    test(`${adapter}: tour is operable and announced with VoiceOver`, async ({
      page,
      voiceOver,
    }, testInfo) => {
      await runTourScenario(page, voiceOver, adapter, testInfo);
    });
  }
});
