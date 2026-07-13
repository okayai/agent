// Spec §7 — Promotion pipeline: candidate → sim → replay → shadow → canary → prod
export type Stage = "candidate" | "static_analysis" | "simulation" | "trace_replay" | "shadow" | "canary" | "production" | "rolled_back";

const ORDER: Stage[] = ["candidate", "static_analysis", "simulation", "trace_replay", "shadow", "canary", "production"];

export interface Behavior {
  id: string;
  name: string;
  stage: Stage;
  history: { stage: Stage; at: string; note?: string }[];
}

const KEY = "okay:promotions";
function readAll(): Behavior[] { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } }
function writeAll(v: Behavior[]) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function create(name: string): Behavior {
  const b: Behavior = {
    id: crypto.randomUUID(), name,
    stage: "candidate",
    history: [{ stage: "candidate", at: new Date().toISOString() }],
  };
  const all = readAll(); all.push(b); writeAll(all);
  return b;
}

export function advance(id: string, note?: string): Behavior | null {
  const all = readAll();
  const b = all.find((x) => x.id === id); if (!b) return null;
  const next = ORDER[ORDER.indexOf(b.stage) + 1];
  if (!next) return b;
  b.stage = next;
  b.history.push({ stage: next, at: new Date().toISOString(), note });
  writeAll(all);
  return b;
}

export function rollback(id: string, note?: string): Behavior | null {
  const all = readAll();
  const b = all.find((x) => x.id === id); if (!b) return null;
  b.stage = "rolled_back";
  b.history.push({ stage: "rolled_back", at: new Date().toISOString(), note });
  writeAll(all);
  return b;
}

export function list(): Behavior[] { return readAll(); }
