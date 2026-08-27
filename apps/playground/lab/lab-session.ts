import type { LabSession } from "./lab-types";

export function createLabSession(): LabSession {
  let automaticReturnArmed = false;
  let previousDemoStarted = false;

  return {
    armAutomaticReturn() {
      automaticReturnArmed = true;
    },
    beginPreviousDemo() {
      if (previousDemoStarted) return false;
      previousDemoStarted = true;
      return true;
    },
    consumeAutomaticReturn() {
      if (!automaticReturnArmed) return false;
      automaticReturnArmed = false;
      return true;
    },
    reset() {
      automaticReturnArmed = false;
      previousDemoStarted = false;
    },
  };
}
