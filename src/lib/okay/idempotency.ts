// Spec §3 — Idempotency & compensation
export interface IdempotencyKey {
  key: string;
  scope: string;
  createdAt: string;
}

const STORE = "okay:idem";
function readAll(): Record<string, IdempotencyKey> {
  try { return JSON.parse(localStorage.getItem(STORE) ?? "{}"); } catch { return {}; }
}
function writeAll(v: Record<string, IdempotencyKey>) {
  localStorage.setItem(STORE, JSON.stringify(v));
}

// Deterministic key from scope + payload; same inputs → same key.
export async function deriveKey(scope: string, payload: unknown): Promise<IdempotencyKey> {
  const material = scope + "\u0000" + JSON.stringify(payload);
  const buf = new TextEncoder().encode(material);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const key = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const rec: IdempotencyKey = { key, scope, createdAt: new Date().toISOString() };
  const all = readAll();
  if (!all[key]) { all[key] = rec; writeAll(all); }
  return all[key];
}

export function seen(key: string): boolean {
  return !!readAll()[key];
}

export function clear(key: string) {
  const all = readAll(); delete all[key]; writeAll(all);
}

// Compensation registry
export interface Compensation {
  action_id: string;
  compensate: () => Promise<void>;
  description: string;
  reversible: boolean;
}

const COMPS: Compensation[] = [];
export function registerCompensation(c: Compensation) { COMPS.push(c); }
export async function compensateAll(action_ids: string[]): Promise<{ done: string[]; skipped: string[] }> {
  const done: string[] = []; const skipped: string[] = [];
  for (const id of action_ids) {
    const c = COMPS.find((x) => x.action_id === id);
    if (!c || !c.reversible) { skipped.push(id); continue; }
    try { await c.compensate(); done.push(id); } catch { skipped.push(id); }
  }
  return { done, skipped };
}
