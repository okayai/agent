// Spec §3 — Independent outcome verifiers.
// A verifier confirms a semantic outcome *after* the executor claims success.
import type { TaskNode } from "./types";
import { append } from "./eventStore";

export interface VerificationEvidence {
  kind: "dom_predicate" | "api_response" | "screenshot_hash" | "provider_receipt";
  ref: string;
  captured_at: string;
}

export interface VerificationResult {
  ok: boolean;
  criterion: string;
  evidence: VerificationEvidence[];
  notes?: string;
}

export type Predicate = (ctx: unknown) => Promise<boolean> | boolean;

export async function verifyNode(
  mission_id: string,
  node: TaskNode,
  predicates: Record<string, Predicate>,
  ctx: unknown,
  captureEvidence: (criterion: string) => Promise<VerificationEvidence[]>,
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  for (const criterion of node.successCriteria) {
    const p = predicates[criterion];
    const evidence = await captureEvidence(criterion);
    const ok = p ? await Promise.resolve(p(ctx)) : false;
    const r: VerificationResult = {
      ok, criterion, evidence,
      notes: p ? undefined : "no predicate implementation registered",
    };
    results.push(r);
    append({
      mission_id,
      type: ok ? "verify:ok" : "verify:fail",
      payload: { node_id: node.id, criterion, notes: r.notes },
      evidence: evidence.map((e) => `${e.kind}:${e.ref}`),
    });
  }
  return results;
}
