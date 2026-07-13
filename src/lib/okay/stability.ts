// Spec §2 — SPA stability tracking (mutation rate, network in-flight, hydration flag)
export interface StabilityState {
  mutationsPerSec: number;
  inflightRequests: number;
  hydrated: boolean;
  loadingOverlayPresent: boolean;
  targetStable: boolean;
}

export interface StabilityHandle {
  read(): StabilityState;
  stop(): void;
  waitStable(opts?: { thresholdMutationsPerSec?: number; timeoutMs?: number }): Promise<boolean>;
}

const ORIG_FETCH = globalThis.fetch;

export function startStabilityTracker(): StabilityHandle {
  let mutationCount = 0;
  let lastReset = performance.now();
  let currentRate = 0;

  const observer = new MutationObserver((records) => {
    mutationCount += records.length;
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

  const interval = window.setInterval(() => {
    const now = performance.now();
    const dt = (now - lastReset) / 1000;
    currentRate = dt > 0 ? mutationCount / dt : 0;
    mutationCount = 0;
    lastReset = now;
  }, 500);

  let inflight = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    inflight++;
    try { return await ORIG_FETCH(input, init); } finally { inflight--; }
  }) as typeof fetch;

  const handle: StabilityHandle = {
    read: () => ({
      mutationsPerSec: currentRate,
      inflightRequests: inflight,
      hydrated: document.readyState === "complete",
      loadingOverlayPresent: !!document.querySelector(
        '[aria-busy="true"], .loading, [data-loading="true"]',
      ),
      targetStable: currentRate < 2 && inflight === 0,
    }),
    stop: () => {
      observer.disconnect();
      window.clearInterval(interval);
      globalThis.fetch = ORIG_FETCH;
    },
    async waitStable({ thresholdMutationsPerSec = 2, timeoutMs = 8000 } = {}) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const s = handle.read();
        if (s.mutationsPerSec < thresholdMutationsPerSec && s.inflightRequests === 0 && !s.loadingOverlayPresent) {
          return true;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      return false;
    },
  };
  return handle;
}
