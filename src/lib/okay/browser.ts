// Spec §4 — Browser worker interface (physical execution host is external).
// This module defines the contract. A hosted Playwright process implements it.
import type { PageSnapshot } from "./perception";

export interface BrowserContext {
  id: string;
  trustDomain: string;
  cookies: unknown[];
  storage: Record<string, string>;
}

export interface BrowserAction {
  kind: "click" | "type" | "select" | "navigate" | "wait" | "screenshot" | "download";
  element_id?: string;
  text?: string;
  url?: string;
  state_version: number; // must match snapshot; stale rejected
}

export interface BrowserWorker {
  newContext(trustDomain: string): Promise<BrowserContext>;
  navigate(ctx: BrowserContext, url: string): Promise<PageSnapshot>;
  perceive(ctx: BrowserContext): Promise<PageSnapshot>;
  act(ctx: BrowserContext, action: BrowserAction): Promise<{ ok: boolean; newSnapshot: PageSnapshot; error?: string }>;
  close(ctx: BrowserContext): Promise<void>;
}

// Mock adapter — validates the contract without a real browser.
export function mockBrowserWorker(): BrowserWorker {
  const contexts = new Map<string, BrowserContext>();
  const versions = new Map<string, number>();

  function snap(ctx: BrowserContext, url = "about:blank"): PageSnapshot {
    const v = (versions.get(ctx.id) ?? 0) + 1;
    versions.set(ctx.id, v);
    return { page: { url, title: "mock", state_version: v }, elements: [], frames: [] };
  }

  return {
    async newContext(trustDomain) {
      const ctx: BrowserContext = { id: crypto.randomUUID(), trustDomain, cookies: [], storage: {} };
      contexts.set(ctx.id, ctx);
      return ctx;
    },
    async navigate(ctx, url) { return snap(ctx, url); },
    async perceive(ctx) { return snap(ctx); },
    async act(ctx, action) {
      const currentV = versions.get(ctx.id) ?? 0;
      if (action.state_version !== currentV) {
        return { ok: false, newSnapshot: snap(ctx), error: "stale_state_version" };
      }
      return { ok: true, newSnapshot: snap(ctx) };
    },
    async close(ctx) { contexts.delete(ctx.id); versions.delete(ctx.id); },
  };
}
