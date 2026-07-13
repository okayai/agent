// Spec §1 & §4 — Credential broker: scoped labels + short-lived capability tokens.
// Secret values are AES-GCM encrypted at rest via ./vault; models see labels only.
import { encryptString, decryptString } from "./vault";

export type TrustDomain = "personal" | "work" | "financial" | "research" | "anonymous";

export interface CredentialRecord {
  id: string;
  label: string;
  trustDomain: TrustDomain;
  createdAt: string;
}

interface StoredCredential extends CredentialRecord {
  _valueRef: string;
}

const KEY_INDEX = "okay:cred:index";
const KEY_VAULT_PREFIX = "okay:cred:v:";

function readIndex(): StoredCredential[] {
  try { return JSON.parse(localStorage.getItem(KEY_INDEX) ?? "[]"); } catch { return []; }
}
function writeIndex(items: StoredCredential[]) {
  localStorage.setItem(KEY_INDEX, JSON.stringify(items));
}

export async function register(label: string, trustDomain: TrustDomain, secret: string): Promise<CredentialRecord> {
  const id = crypto.randomUUID();
  const valueRef = crypto.randomUUID();
  const ciphertext = await encryptString(secret);
  localStorage.setItem(KEY_VAULT_PREFIX + valueRef, ciphertext);
  const rec: StoredCredential = { id, label, trustDomain, createdAt: new Date().toISOString(), _valueRef: valueRef };
  const idx = readIndex(); idx.push(rec); writeIndex(idx);
  return { id, label, trustDomain, createdAt: rec.createdAt };
}

export function list(): CredentialRecord[] {
  return readIndex().map(({ _valueRef: _, ...r }) => r);
}

export function revoke(id: string) {
  const idx = readIndex();
  const found = idx.find((c) => c.id === id);
  if (found) localStorage.removeItem(KEY_VAULT_PREFIX + found._valueRef);
  writeIndex(idx.filter((c) => c.id !== id));
}

// Capability token — short-lived, scoped, opaque to models.
export interface CapabilityToken {
  token: string;
  credential_id: string;
  capability: string;
  expiresAt: string;
}

const KEY_TOKENS = "okay:cred:tokens";
function readTokens(): CapabilityToken[] {
  try { return JSON.parse(localStorage.getItem(KEY_TOKENS) ?? "[]"); } catch { return []; }
}
function writeTokens(t: CapabilityToken[]) {
  localStorage.setItem(KEY_TOKENS, JSON.stringify(t));
}

export function mintToken(credential_id: string, capability: string, ttlSec = 60): CapabilityToken {
  const t: CapabilityToken = {
    token: crypto.randomUUID(),
    credential_id, capability,
    expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const tokens = readTokens().filter((x) => +new Date(x.expiresAt) > Date.now());
  tokens.push(t);
  writeTokens(tokens);
  return t;
}

// Redeem — returns the decrypted secret ONCE for a worker, then invalidates the token.
export async function redeem(token: string): Promise<string | null> {
  const tokens = readTokens();
  const idx = tokens.findIndex((t) => t.token === token);
  if (idx === -1) return null;
  const t = tokens[idx];
  if (+new Date(t.expiresAt) <= Date.now()) {
    tokens.splice(idx, 1); writeTokens(tokens); return null;
  }
  tokens.splice(idx, 1); writeTokens(tokens);
  const rec = readIndex().find((c) => c.id === t.credential_id);
  if (!rec) return null;
  const ct = localStorage.getItem(KEY_VAULT_PREFIX + rec._valueRef);
  if (!ct) return null;
  try { return await decryptString(ct); } catch { return null; }
}
