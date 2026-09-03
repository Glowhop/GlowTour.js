export function abortError(): DOMException {
  return new DOMException("The operation was aborted", "AbortError");
}

export function abortableDelay(delay: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw abortError();
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(abortError());
    };
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, delay);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
