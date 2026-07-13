// Spec §5 — 4-class memory service with admission controller & scoped retrieval
import type { MemoryClass, MemoryItem, Sensitivity } from "./types";

const KEY = "okay:memory";

function readAll(): MemoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as MemoryItem[];
  } catch {
    return [];
  }
}

function writeAll(items: MemoryItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export interface AdmitOptions {
  userConsented?: boolean;
  conflictsWith?: string; // id of existing item this supersedes
}

export interface AdmitResult {
  admitted: MemoryItem | null;
  reason: string;
}

const DEFAULT_TTL_MS: Record<Sensitivity, number | null> = {
  low: null,
  medium: 1000 * 60 * 60 * 24 * 30, // 30d
  high: 1000 * 60 * 60 * 24, // 24h unless explicit consent extends
};

export function admit(
  input: Omit<MemoryItem, "id" | "createdAt" | "expiresAt"> & {
    expiresAt?: string;
  },
  opts: AdmitOptions = {},
): AdmitResult {
  if (input.sensitivity === "high" && !opts.userConsented) {
    return { admitted: null, reason: "sensitive item requires user consent" };
  }

  const all = readAll();
  if (opts.conflictsWith) {
    const idx = all.findIndex((m) => m.id === opts.conflictsWith);
    if (idx !== -1) all.splice(idx, 1);
  }

  let expiresAt = input.expiresAt;
  if (!expiresAt) {
    const ttl = DEFAULT_TTL_MS[input.sensitivity];
    if (ttl) expiresAt = new Date(Date.now() + ttl).toISOString();
  }

  const item: MemoryItem = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    expiresAt,
  };
  all.push(item);
  writeAll(all);
  return { admitted: item, reason: "admitted" };
}

export interface RetrievalScope {
  class?: MemoryClass;
  key?: string;
  minSensitivity?: Sensitivity;
  maxSensitivity?: Sensitivity;
  provenance?: string;
}

const SENS_ORDER: Sensitivity[] = ["low", "medium", "high"];

export function query(scope: RetrievalScope = {}): MemoryItem[] {
  const now = Date.now();
  return readAll().filter((m) => {
    if (m.expiresAt && +new Date(m.expiresAt) <= now) return false;
    if (scope.class && m.class !== scope.class) return false;
    if (scope.key && m.key !== scope.key) return false;
    if (scope.provenance && m.provenance !== scope.provenance) return false;
    if (
      scope.minSensitivity &&
      SENS_ORDER.indexOf(m.sensitivity) < SENS_ORDER.indexOf(scope.minSensitivity)
    )
      return false;
    if (
      scope.maxSensitivity &&
      SENS_ORDER.indexOf(m.sensitivity) > SENS_ORDER.indexOf(scope.maxSensitivity)
    )
      return false;
    return true;
  });
}

export function forget(id: string) {
  writeAll(readAll().filter((m) => m.id !== id));
}

export function exportAll(): MemoryItem[] {
  return readAll();
}

export function purgeExpired(): number {
  const now = Date.now();
  const all = readAll();
  const kept = all.filter((m) => !m.expiresAt || +new Date(m.expiresAt) > now);
  writeAll(kept);
  return all.length - kept.length;
}
