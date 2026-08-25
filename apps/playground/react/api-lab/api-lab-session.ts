export interface ApiLabSession {
  armAutomaticReturn(): void;
  beginPreviousDemo(): boolean;
  consumeAutomaticReturn(): boolean;
  reset(): void;
}

export function createApiLabSession(): ApiLabSession {
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
