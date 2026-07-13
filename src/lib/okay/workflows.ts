// Spec §5 — Procedural memory: versioned workflow templates.
import { admit, query, forget } from "./memory";
import type { MemoryItem } from "./types";

export interface WorkflowTemplate {
  name: string;
  platform: string;
  version: number;
  preconditions: string[];
  semanticSteps: string[];
  assertions: string[];
  variants: string[];
  sensitiveActions: string[];
  recoveryPaths: string[];
  platformVersion: string;
  lastVerified: string;
}

export function saveTemplate(t: Omit<WorkflowTemplate, "version" | "lastVerified"> & { version?: number }): MemoryItem | null {
  const prior = query({ class: "procedural", key: `workflow:${t.name}` });
  const latest = prior.sort((a, b) => (b.value as WorkflowTemplate).version - (a.value as WorkflowTemplate).version)[0];
  const version = t.version ?? ((latest?.value as WorkflowTemplate | undefined)?.version ?? 0) + 1;
  const value: WorkflowTemplate = { ...t, version, lastVerified: new Date().toISOString() };
  return admit({
    class: "procedural",
    key: `workflow:${t.name}`,
    value,
    sensitivity: "low",
    provenance: `demonstration@${new Date().toISOString()}`,
  }).admitted;
}

export function latest(name: string): WorkflowTemplate | undefined {
  const items = query({ class: "procedural", key: `workflow:${name}` });
  return items.map((i) => i.value as WorkflowTemplate).sort((a, b) => b.version - a.version)[0];
}

export function retire(name: string) {
  for (const i of query({ class: "procedural", key: `workflow:${name}` })) forget(i.id);
}
