// Spec §6 — R0–R5 risk classification
import type { ActionEnvelope, RiskTier } from "./types";

const PROHIBITED = [
  "purchase.weapon",
  "attack.",
  "exploit.",
  "harm.",
];

export function classifyRisk(env: ActionEnvelope): RiskTier {
  const cap = env.capability;

  if (PROHIBITED.some((p) => cap.startsWith(p))) return "R5";
  if (cap.startsWith("read.public")) return "R0";

  // Financial / irreversible external → R4
  if (
    env.effect.financial ||
    cap.startsWith("purchase.") ||
    cap.startsWith("account.security") ||
    cap.startsWith("legal.")
  ) {
    return "R4";
  }

  // External communications / publishing → R3
  if (
    cap.startsWith("send.") ||
    cap.startsWith("publish.") ||
    cap.startsWith("invite.")
  ) {
    return "R3";
  }

  // Modify external cloud resources → R2
  if (
    cap.startsWith("upload.") ||
    cap.startsWith("update.cloud") ||
    (env.effect.external && env.effect.reversible)
  ) {
    return "R2";
  }

  // Local drafts / logged automation → R1
  if (cap.startsWith("draft.") || cap.startsWith("local.")) return "R1";

  return env.effect.external ? "R2" : "R1";
}
