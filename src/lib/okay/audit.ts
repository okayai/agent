// Spec §1 — Audit service with hash-chained events (tamper-evident)
import { append, replay } from "./eventStore";
import type { OkayEvent } from "./types";

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function auditAppend(
  missionId: string,
  type: string,
  payload: Record<string, unknown>,
  evidence?: string[],
): Promise<OkayEvent> {
  const history = replay(missionId);
  const prevHash =
    (history[history.length - 1]?.payload as { _hash?: string } | undefined)
      ?._hash ?? "";

  const timestamp = new Date().toISOString();
  const material = JSON.stringify({ type, payload, prevHash, timestamp });
  const hash = await sha256Hex(material);

  return append({
    mission_id: missionId,
    type: `audit:${type}`,
    payload: { ...payload, _hash: hash, _prevHash: prevHash },
    evidence,
    timestamp,
  });
}

export interface AuditVerification {
  ok: boolean;
  brokenAt?: string;
}

export async function verifyChain(
  missionId: string,
): Promise<AuditVerification> {
  const events = replay(missionId).filter((e) => e.type.startsWith("audit:"));
  let prevHash = "";
  for (const e of events) {
    const p = e.payload as { _hash?: string; _prevHash?: string };
    if ((p._prevHash ?? "") !== prevHash) {
      return { ok: false, brokenAt: e.event_id };
    }
    const material = JSON.stringify({
      type: e.type.replace(/^audit:/, ""),
      payload: Object.fromEntries(
        Object.entries(p).filter(([k]) => k !== "_hash" && k !== "_prevHash"),
      ),
      prevHash: p._prevHash ?? "",
      timestamp: e.timestamp,
    });
    const recomputed = await sha256Hex(material);
    if (recomputed !== p._hash) return { ok: false, brokenAt: e.event_id };
    prevHash = p._hash ?? "";
  }
  return { ok: true };
}
