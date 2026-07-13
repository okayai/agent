// Spec §7 — BROWSER RELIABILITY test suite
import { describe, it, expect, beforeEach } from "vitest";
import { mockBrowserWorker } from "@/lib/okay/browser";
import { init, readyNodes, run } from "@/lib/okay/orchestrator";
import { isValidDAG } from "@/lib/okay/planners";
import { runBoundedRetry, classify } from "@/lib/okay/failure";
import type { TaskDAG } from "@/lib/okay/types";

beforeEach(() => localStorage.clear());

describe("stale element rejection", () => {
  it("rejects actions with stale state_version", async () => {
    const w = mockBrowserWorker();
    const ctx = await w.newContext("research");
    await w.navigate(ctx, "https://example.com");
    // supply an obviously stale version
    const r = await w.act(ctx, { kind: "click", element_id: "e1", state_version: 0 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("stale_state_version");
  });
});

describe("DAG orchestrator", () => {
  const dag: TaskDAG = {
    mission_id: "m1",
    nodes: [
      { id: "a", capability: "read.public.page", inputs: [], dependencies: [], preconditions: [], successCriteria: ["loaded"], policyClass: "R0", retryPolicy: { max: 2, backoffMs: 10 }, alternatives: [] },
      { id: "b", capability: "draft.local",       inputs: [], dependencies: ["a"], preconditions: [], successCriteria: ["draft exists"], policyClass: "R1", retryPolicy: { max: 2, backoffMs: 10 }, alternatives: [] },
      { id: "c", capability: "draft.local",       inputs: [], dependencies: ["b"], preconditions: [], successCriteria: ["review ready"], policyClass: "R1", retryPolicy: { max: 2, backoffMs: 10 }, alternatives: [] },
    ],
  };

  it("validates as a proper DAG", () => {
    expect(isValidDAG(dag).ok).toBe(true);
  });

  it("skips descendants of failed nodes (no duplicate side effects)", async () => {
    const s = init(dag);
    await run(s, async (n) => ({ ok: n.id !== "b" }));
    expect(s.nodes.a.state).toBe("succeeded");
    expect(s.nodes.b.state).toBe("failed");
    expect(s.nodes.c.state).toBe("skipped");
  });

  it("readyNodes respects dependencies", () => {
    const s = init(dag);
    expect(readyNodes(s).map((n) => n.id)).toEqual(["a"]);
  });

  it("detects cycles", () => {
    const cyclic: TaskDAG = { mission_id: "m2", nodes: [
      { id: "a", capability: "x", inputs: [], dependencies: ["b"], preconditions: [], successCriteria: ["ok"], policyClass: "R0", retryPolicy: { max: 1, backoffMs: 0 }, alternatives: [] },
      { id: "b", capability: "x", inputs: [], dependencies: ["a"], preconditions: [], successCriteria: ["ok"], policyClass: "R0", retryPolicy: { max: 1, backoffMs: 0 }, alternatives: [] },
    ]};
    expect(isValidDAG(cyclic).ok).toBe(false);
  });
});

describe("failure classifier & bounded retry", () => {
  it("classifies HTTP 429 as transient_network", () => {
    expect(classify({ status: 429 })).toBe("transient_network");
  });
  it("classifies 401 as auth_expired", () => {
    expect(classify({ status: 401 })).toBe("auth_expired");
  });

  it("bounded retry stops after max attempts", async () => {
    let calls = 0;
    const r = await runBoundedRetry(
      async () => { calls++; throw new Error("network"); },
      { max: 3, backoffMs: 1, externallyConsequential: false },
      async () => true,
    );
    expect(r.ok).toBe(false);
    expect(r.attempts).toBe(3);
    expect(calls).toBe(3);
  });

  it("does NOT retry an externally-consequential possibly-succeeded action", async () => {
    let calls = 0;
    const r = await runBoundedRetry(
      async () => { calls++; return { sent: true }; },
      { max: 5, backoffMs: 1, externallyConsequential: true },
      async () => false, // couldn't verify success
    );
    expect(calls).toBe(1); // never retried
    expect(r.ok).toBe(false);
  });
});
