// OKAY typed contracts — Spec §3, §5, §6

export type RiskTier = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";

export type PolicyDecision =
  | "ALLOW"
  | "ALLOW_WITH_CONSTRAINTS"
  | "REQUIRE_CONFIRMATION"
  | "REQUIRE_USER_ACTION"
  | "DENY";

export type PolicyLevel =
  | "law"
  | "org"
  | "user"
  | "mission"
  | "inferred"
  | "model";

export interface Unknowns {
  blocking: string[];
  deferrable: string[];
  inferable: string[];
  defaultable: string[];
}

export interface TypedGoal {
  goal: string;
  deliverables: string[];
  constraints: Record<string, unknown>;
  unknowns: Unknowns;
}

export interface RetryPolicy {
  max: number;
  backoffMs: number;
}

export interface TaskNode {
  id: string;
  capability: string;
  inputs: string[];
  dependencies: string[];
  preconditions: string[];
  successCriteria: string[];
  policyClass: RiskTier;
  retryPolicy: RetryPolicy;
  alternatives: string[];
  compensation?: string[];
  deadline?: string;
}

export interface TaskDAG {
  mission_id: string;
  nodes: TaskNode[];
}

export interface ActionEnvelope {
  actor: "okay";
  user: string;
  capability: string;
  target: string;
  data: string[];
  effect: {
    financial: boolean;
    external: boolean;
    reversible: boolean;
  };
  amount?: number;
  currency?: string;
  justification?: string;
  evidence?: string[];
}

export interface PolicyRule {
  level: PolicyLevel;
  capability?: string; // dotted prefix, e.g. "send" or "purchase.flight"
  decision: PolicyDecision;
  reason: string;
  maxAmount?: number;
}

export interface PolicyEvaluation {
  decision: PolicyDecision;
  tier: RiskTier;
  reasons: string[];
  constraints: string[];
  precedenceApplied: PolicyLevel | "default";
}

export type MemoryClass = "working" | "episodic" | "semantic" | "procedural";

export type Sensitivity = "low" | "medium" | "high";

export interface MemoryItem {
  id: string;
  class: MemoryClass;
  key: string;
  value: unknown;
  provenance?: string;
  sensitivity: Sensitivity;
  expiresAt?: string;
  createdAt: string;
}

export interface OkayEvent {
  event_id: string;
  mission_id: string;
  type: string;
  payload: Record<string, unknown>;
  evidence?: string[];
  timestamp: string;
}
