// Spec §4 — AES-GCM at-rest encryption for the credential vault.
// Key is generated on first run and stored in an isolated localStorage slot.
// Not a substitute for a real KMS — but meets the "encrypted at rest" contract
// within a client-only prototype.

const KEY_SLOT = "okay:vaultKey";

async function getKey(): Promise<CryptoKey> {
  const raw = localStorage.getItem(KEY_SLOT);
  if (raw) {
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const exported = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  localStorage.setItem(KEY_SLOT, btoa(String.fromCharCode(...exported)));
  return key;
}

export async function encryptString(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)));
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0); packed.set(ct, iv.length);
  return btoa(String.fromCharCode(...packed));
}

export async function decryptString(cipherB64: string): Promise<string> {
  const key = await getKey();
  const packed = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  const iv = packed.slice(0, 12);
  const ct = packed.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
