/** Session storage key holding the tour to resume after a full page reload. */
export const RESUME_KEY = "glowtour:multipage";

/** Snapshot of a running tour, persisted across a full page navigation. */
export interface PersistedTour {
  readonly workflow: string;
  readonly stepIndex: number;
}

export function persistTour(state: PersistedTour): void {
  sessionStorage.setItem(RESUME_KEY, JSON.stringify(state));
}

export function readPersistedTour(): PersistedTour | null {
  const raw = sessionStorage.getItem(RESUME_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedTour;
  } catch {
    return null;
  }
}

export function clearPersistedTour(): void {
  sessionStorage.removeItem(RESUME_KEY);
}

/** Appends timestamped lines to a log panel so each scenario leaves a trace. */
export function createLogger(target: HTMLElement) {
  return (message: string) => {
    const time = new Date().toLocaleTimeString();
    target.textContent = `${target.textContent ?? ""}[${time}] ${message}\n`;
    target.scrollTop = target.scrollHeight;
  };
}
