// Spec §3 — Hierarchical planners: mission / workflow / reactive
import type { TaskDAG, TaskNode } from "./types";
import type { PageSnapshot } from "./perception";

// Workflow planner: given a mission node + platform hint, produce platform-specific sub-steps.
export interface WorkflowStep {
  id: string;
  intent: string; // semantic, not clicks
  precondition: string;
  recovery: string;
}

export function planWorkflow(node: TaskNode, platform: string): WorkflowStep[] {
  const base: WorkflowStep[] = [
    { id: `${node.id}.load`,   intent: `open ${platform}`,            precondition: "network available",         recovery: "try approved alternative" },
    { id: `${node.id}.auth`,   intent: "confirm authenticated",       precondition: "session valid",             recovery: "user handoff" },
    { id: `${node.id}.act`,    intent: node.capability,                precondition: "ready element visible",     recovery: "reground and re-attempt" },
    { id: `${node.id}.verify`, intent: "verify semantic success",     precondition: node.successCriteria[0] ?? "outcome observable", recovery: "escalate if verification fails" },
  ];
  return base;
}

// Reactive controller: chooses the next safe UI action from current state + workflow step.
export interface ReactiveAction {
  kind: "click" | "type" | "scroll" | "wait" | "handoff";
  target_id?: string;
  text?: string;
  reason: string;
}

export function nextAction(step: WorkflowStep, snapshot: PageSnapshot): ReactiveAction {
  if (snapshot.captcha) return { kind: "handoff", reason: "CAPTCHA detected — user must complete" };
  if (snapshot.modal) return { kind: "click", target_id: snapshot.elements.find((e) => /close|dismiss|ok|accept/i.test(e.name))?.id, reason: `dismiss modal "${snapshot.modal.name}"` };
  const candidate = snapshot.elements.find((e) => e.visible && e.enabled && new RegExp(step.intent.split(" ").slice(-1)[0], "i").test(e.name));
  if (candidate) return { kind: "click", target_id: candidate.id, reason: `matches "${step.intent}"` };
  return { kind: "wait", reason: "no confident candidate; wait for stability" };
}

// Mission planner is the edge-fn `okay-plan` (DAG). Re-exported helper:
export function isValidDAG(dag: TaskDAG): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const ids = new Set(dag.nodes.map((n) => n.id));
  for (const n of dag.nodes) {
    for (const d of n.dependencies) {
      if (!ids.has(d)) issues.push(`${n.id} depends on unknown ${d}`);
      if (d === n.id) issues.push(`${n.id} depends on itself`);
    }
    if (n.successCriteria.length === 0) issues.push(`${n.id} has no successCriteria`);
  }
  // cycle detection (Kahn's)
  const indeg = new Map<string, number>();
  dag.nodes.forEach((n) => indeg.set(n.id, 0));
  dag.nodes.forEach((n) => n.dependencies.forEach((d) => indeg.set(n.id, (indeg.get(n.id) ?? 0) + (ids.has(d) ? 1 : 0))));
  const queue = [...indeg.entries()].filter(([, v]) => v === 0).map(([k]) => k);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift()!; visited++;
    for (const n of dag.nodes) {
      if (n.dependencies.includes(id)) {
        indeg.set(n.id, (indeg.get(n.id) ?? 0) - 1);
        if (indeg.get(n.id) === 0) queue.push(n.id);
      }
    }
  }
  if (visited !== dag.nodes.length) issues.push("cycle detected");
  return { ok: issues.length === 0, issues };
}
