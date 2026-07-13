// Spec §1 — Context assembler
import type { PolicyRule, TypedGoal } from "./types";
import { query as memQuery } from "./memory";
import { list as credList } from "./credentialBroker";
import { replay } from "./eventStore";

export interface AssembledContext {
  mission_id: string;
  memory: {
    working: unknown[];
    semantic: unknown[];
    procedural: unknown[];
  };
  policies: PolicyRule[];
  credentials: string[]; // labels only — never values
  recentEvents: unknown[];
  goal?: TypedGoal;
}

export function assemble(
  mission_id: string,
  policies: PolicyRule[],
  goal?: TypedGoal,
): AssembledContext {
  return {
    mission_id,
    memory: {
      working: memQuery({ class: "working" }).map((m) => ({ key: m.key, value: m.value })),
      semantic: memQuery({ class: "semantic" }).map((m) => ({ key: m.key, value: m.value, provenance: m.provenance })),
      procedural: memQuery({ class: "procedural" }).map((m) => ({ key: m.key, value: m.value })),
    },
    policies,
    credentials: credList().map((c) => c.label),
    recentEvents: replay(mission_id).slice(-25).map((e) => ({ type: e.type, timestamp: e.timestamp })),
    goal,
  };
}
