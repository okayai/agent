// Spec §1 & §3 — Orchestrator with DAG scheduling, page leases, and state machine
import type { TaskDAG, TaskNode } from "./types";
import { append } from "./eventStore";

export type NodeState = "pending" | "ready" | "running" | "succeeded" | "failed" | "skipped";

export interface OrchestratorState {
  mission_id: string;
  nodes: Record<string, { node: TaskNode; state: NodeState; attempts: number }>;
}

export function init(dag: TaskDAG): OrchestratorState {
  const s: OrchestratorState = { mission_id: dag.mission_id, nodes: {} };
  for (const n of dag.nodes) s.nodes[n.id] = { node: n, state: "pending", attempts: 0 };
  return s;
}

export function readyNodes(s: OrchestratorState): TaskNode[] {
  return Object.values(s.nodes)
    .filter((e) => e.state === "pending" && e.node.dependencies.every((d) => s.nodes[d]?.state === "succeeded"))
    .map((e) => e.node);
}

export function transition(s: OrchestratorState, id: string, to: NodeState, note?: string) {
  const e = s.nodes[id]; if (!e) return;
  e.state = to;
  if (to === "running") e.attempts++;
  append({
    mission_id: s.mission_id,
    type: `orchestrator:${to}`,
    payload: { node_id: id, attempts: e.attempts, note },
  });
}

// Page leases — one task owns a page at a time.
interface Lease { page_id: string; task_id: string; expiresAt: number; }
const LEASES: Lease[] = [];
export function acquireLease(page_id: string, task_id: string, ttlMs = 30000): boolean {
  const now = Date.now();
  const existing = LEASES.find((l) => l.page_id === page_id && l.expiresAt > now);
  if (existing && existing.task_id !== task_id) return false;
  if (existing) { existing.expiresAt = now + ttlMs; return true; }
  LEASES.push({ page_id, task_id, expiresAt: now + ttlMs });
  return true;
}
export function releaseLease(page_id: string, task_id: string) {
  const i = LEASES.findIndex((l) => l.page_id === page_id && l.task_id === task_id);
  if (i !== -1) LEASES.splice(i, 1);
}

export interface RunWorker {
  (node: TaskNode): Promise<{ ok: boolean; note?: string }>;
}

// Simple driver that runs the DAG to completion using a supplied worker.
export async function run(s: OrchestratorState, worker: RunWorker, maxSteps = 100): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    const ready = readyNodes(s);
    if (ready.length === 0) return;
    await Promise.all(ready.map(async (n) => {
      transition(s, n.id, "running");
      try {
        const r = await worker(n);
        transition(s, n.id, r.ok ? "succeeded" : "failed", r.note);
      } catch (e) {
        transition(s, n.id, "failed", (e as Error).message);
      }
    }));
    // Skip descendants of failed nodes.
    for (const e of Object.values(s.nodes)) {
      if (e.state !== "pending") continue;
      if (e.node.dependencies.some((d) => s.nodes[d]?.state === "failed" || s.nodes[d]?.state === "skipped")) {
        transition(s, e.node.id, "skipped", "upstream failure");
      }
    }
  }
}
