// Spec §3 — Failure classification & bounded retry orchestration
export type FailureClass =
  | "transient_network"
  | "stale_element"
  | "layout_change"
  | "auth_expired"
  | "constraint_violation"
  | "ambiguous_irreversible"
  | "state_changed"
  | "site_unavailable"
  | "unknown_repeated";

export interface FailureResponse {
  action: "retry" | "reground" | "switch_strategy" | "refresh_auth" | "replan" | "ask_user" | "try_alternative" | "escalate";
  bounded: boolean;
  reason: string;
}

const TABLE: Record<FailureClass, FailureResponse> = {
  transient_network:      { action: "retry",           bounded: true,  reason: "bounded backoff" },
  stale_element:          { action: "reground",        bounded: true,  reason: "re-perceive DOM" },
  layout_change:          { action: "switch_strategy", bounded: true,  reason: "try visual grounding" },
  auth_expired:           { action: "refresh_auth",    bounded: true,  reason: "user handoff if refresh unsafe" },
  constraint_violation:   { action: "replan",          bounded: true,  reason: "stop branch and re-plan" },
  ambiguous_irreversible: { action: "ask_user",        bounded: true,  reason: "never assume on irreversible" },
  state_changed:          { action: "replan",          bounded: true,  reason: "re-evaluate against user conditions" },
  site_unavailable:       { action: "try_alternative", bounded: true,  reason: "approved alternative provider" },
  unknown_repeated:       { action: "escalate",        bounded: true,  reason: "preserve state and hand off" },
};

export function classify(err: { message?: string; kind?: string; status?: number }): FailureClass {
  const m = (err.message ?? "").toLowerCase();
  const k = (err.kind ?? "").toLowerCase();
  if (k === "stale" || m.includes("detached")) return "stale_element";
  if (k === "auth" || err.status === 401 || err.status === 403) return "auth_expired";
  if (k === "constraint") return "constraint_violation";
  if (k === "irreversible") return "ambiguous_irreversible";
  if (k === "state") return "state_changed";
  if (err.status === 503 || err.status === 504) return "site_unavailable";
  if (err.status === 408 || err.status === 429 || m.includes("network") || m.includes("timeout")) return "transient_network";
  if (k === "layout") return "layout_change";
  return "unknown_repeated";
}

export function respond(cls: FailureClass): FailureResponse {
  return TABLE[cls];
}

// Bounded retry driver — never blindly repeats externally consequential actions.
export interface RetryContext {
  attempt: number;
  max: number;
  backoffMs: number;
  externallyConsequential: boolean;
}

export async function runBoundedRetry<T>(
  fn: () => Promise<T>,
  ctx: Pick<RetryContext, "max" | "backoffMs" | "externallyConsequential">,
  isSuccessful: (result: T) => Promise<boolean>,
): Promise<{ ok: boolean; attempts: number; result?: T; classes: FailureClass[] }> {
  const classes: FailureClass[] = [];
  for (let attempt = 1; attempt <= ctx.max; attempt++) {
    try {
      const r = await fn();
      const ok = await isSuccessful(r);
      if (ok) return { ok: true, attempts: attempt, result: r, classes };
      classes.push("state_changed");
      if (ctx.externallyConsequential) {
        // Never retry a maybe-succeeded external action without idempotency proof.
        return { ok: false, attempts: attempt, classes };
      }
    } catch (e) {
      const cls = classify(e as { message?: string });
      classes.push(cls);
      if (cls === "ambiguous_irreversible" || cls === "constraint_violation") {
        return { ok: false, attempts: attempt, classes };
      }
    }
    await new Promise((r) => setTimeout(r, ctx.backoffMs * attempt));
  }
  return { ok: false, attempts: ctx.max, classes };
}
