// Spec §4 — Virtual workspace filesystem
// Files are metadata-first. Downloads quarantine until scanned.
import { admit } from "./memory";

export type Sensitivity = "low" | "medium" | "high";

export interface FileRecord {
  id: string;
  name: string;
  origin: "download" | "upload" | "generated";
  sourceUrl?: string;
  mime: string;
  detectedType: string;
  sizeBytes: number;
  hash: string;
  sensitivity: Sensitivity;
  scan: "pending" | "clean" | "infected" | "suspicious";
  destination?: string;
  retention: "session" | "mission" | "30d" | "user_controlled";
  quarantined: boolean;
  createdAt: string;
}

const KEY = "okay:fs";
function readAll(): FileRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function writeAll(v: FileRecord[]) { localStorage.setItem(KEY, JSON.stringify(v)); }

async function sha256(bytes: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const DANGEROUS_MIMES = ["application/x-msdownload", "application/x-msi", "application/x-sh"];

export async function ingest(bytes: Uint8Array, meta: Omit<FileRecord, "id" | "hash" | "createdAt" | "quarantined" | "scan" | "sizeBytes">): Promise<FileRecord> {
  const hash = await sha256(bytes);
  const rec: FileRecord = {
    ...meta,
    id: crypto.randomUUID(),
    hash, sizeBytes: bytes.byteLength,
    scan: "pending",
    quarantined: true,
    createdAt: new Date().toISOString(),
  };
  const all = readAll(); all.push(rec); writeAll(all);
  return rec;
}

// Static scan: MIME blocklist, path traversal, decompression bombs.
export function scan(rec: FileRecord, opts: { archiveEntries?: string[]; uncompressedRatio?: number } = {}): FileRecord {
  const all = readAll();
  const idx = all.findIndex((f) => f.id === rec.id);
  if (idx === -1) return rec;

  let status: FileRecord["scan"] = "clean";
  if (DANGEROUS_MIMES.includes(rec.mime)) status = "infected";
  if (opts.uncompressedRatio && opts.uncompressedRatio > 100) status = "suspicious";
  if (opts.archiveEntries?.some((n) => n.includes("..") || n.startsWith("/"))) status = "infected";

  all[idx] = { ...all[idx], scan: status, quarantined: status !== "clean" };
  writeAll(all);
  return all[idx];
}

export function list(): FileRecord[] { return readAll(); }
export function get(id: string): FileRecord | undefined { return readAll().find((f) => f.id === id); }

// Register in procedural memory only when clean & retention warrants persistence.
export function persistIfEligible(rec: FileRecord) {
  if (rec.scan !== "clean") return null;
  if (rec.retention === "session") return null;
  return admit({
    class: "procedural",
    key: `file:${rec.name}`,
    value: { id: rec.id, hash: rec.hash, mime: rec.mime, retention: rec.retention },
    sensitivity: rec.sensitivity,
    provenance: rec.sourceUrl ?? rec.origin,
  });
}
