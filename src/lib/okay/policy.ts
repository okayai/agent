// Spec §6 — Ethical governor: deterministic policy decision point
import type {
  ActionEnvelope,
  PolicyDecision,
  PolicyEvaluation,
  PolicyLevel,
  PolicyRule,
} from "./types";
import { classifyRisk } from "./riskTiers";

const PRECEDENCE: PolicyLevel[] = [
  "law",
  "org",
  "user",
  "mission",
  "inferred",
  "model",
];

function ruleApplies(rule: PolicyRule, env: ActionEnvelope): boolean {
  if (!rule.capability) return true;
  return (
    env.capability === rule.capability ||
    env.capability.startsWith(rule.capability + ".")
  );
}

function combine(a: PolicyDecision, b: PolicyDecision): PolicyDecision {
  // Most restrictive wins when merging peer-level rules.
  const order: PolicyDecision[] = [
    "ALLOW",
    "ALLOW_WITH_CONSTRAINTS",
    "REQUIRE_CONFIRMATION",
    "REQUIRE_USER_ACTION",
    "DENY",
  ];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

export function evaluate(
  env: ActionEnvelope,
  rules: PolicyRule[],
): PolicyEvaluation {
  const tier = classifyRisk(env);
  const constraints: string[] = [];
  const reasons: string[] = [`tier=${tier}`];

  // Group applicable rules by precedence level.
  const grouped = new Map<PolicyLevel, PolicyRule[]>();
  for (const r of rules) {
    if (!ruleApplies(r, env)) continue;
    if (!grouped.has(r.level)) grouped.set(r.level, []);
    grouped.get(r.level)!.push(r);
  }

  // Take the highest-precedence level that has a rule; combine within it.
  let applied: PolicyLevel | "default" = "default";
  let decision: PolicyDecision | null = null;
  for (const level of PRECEDENCE) {
    const rs = grouped.get(level);
    if (!rs || rs.length === 0) continue;
    applied = level;
    for (const r of rs) {
      decision = decision ? combine(decision, r.decision) : r.decision;
      reasons.push(`${level}: ${r.reason}`);
      if (r.maxAmount && env.amount && env.amount > r.maxAmount) {
        decision = combine(decision, "REQUIRE_CONFIRMATION");
        constraints.push(
          `amount ${env.amount} exceeds ${level} ceiling ${r.maxAmount}`,
        );
      }
    }
    break;
  }

  // Default tier-based decision when no rule matched.
  if (!decision) {
    if (tier === "R5") decision = "DENY";
    else if (tier === "R4") decision = "REQUIRE_CONFIRMATION";
    else if (tier === "R3") decision = "REQUIRE_CONFIRMATION";
    else if (tier === "R2") decision = "ALLOW_WITH_CONSTRAINTS";
    else decision = "ALLOW";
  }

  // Absolute floors — law/tier R5 cannot be overridden.
  if (tier === "R5") decision = "DENY";

  return { decision, tier, reasons, constraints, precedenceApplied: applied };
}

export const DEFAULT_RULES: PolicyRule[] = [
  { level: "law", capability: "attack", decision: "DENY", reason: "unlawful" },
  { level: "law", capability: "harm", decision: "DENY", reason: "unlawful" },
  {
    level: "user",
    capability: "purchase",
    decision: "REQUIRE_CONFIRMATION",
    reason: "purchases require explicit approval",
    maxAmount: 0,
  },
  {
    level: "user",
    capability: "send.email",
    decision: "REQUIRE_CONFIRMATION",
    reason: "verify recipient before send",
  },
];
