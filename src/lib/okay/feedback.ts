// Spec §7 — Feedback loop: correction → candidate preference
import { admit } from "./memory";
import { append } from "./eventStore";

export interface Correction {
  context: string;
  agent_choice: string;
  user_correction: string;
  candidate_preference?: { rule: string; scope: string };
}

export interface CandidatePreference {
  id: string;
  rule: string;
  scope: string;
  status: "candidate" | "approved" | "rejected";
  createdAt: string;
}

const KEY = "okay:prefs";
function readAll(): CandidatePreference[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function writeAll(v: CandidatePreference[]) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function record(mission_id: string, c: Correction): CandidatePreference | null {
  append({ mission_id, type: "feedback:correction", payload: c as unknown as Record<string, unknown> });
  if (!c.candidate_preference) return null;
  const p: CandidatePreference = {
    id: crypto.randomUUID(),
    rule: c.candidate_preference.rule,
    scope: c.candidate_preference.scope,
    status: "candidate",
    createdAt: new Date().toISOString(),
  };
  const all = readAll(); all.push(p); writeAll(all);
  return p;
}

export function approve(id: string) {
  const all = readAll();
  const p = all.find((x) => x.id === id); if (!p) return;
  p.status = "approved"; writeAll(all);
  admit({
    class: "semantic",
    key: `pref:${p.scope}`,
    value: p.rule,
    sensitivity: "low",
    provenance: "user_approved_correction",
  });
}

export function reject(id: string) {
  const all = readAll();
  const p = all.find((x) => x.id === id); if (!p) return;
  p.status = "rejected"; writeAll(all);
}

export function list(): CandidatePreference[] { return readAll(); }
