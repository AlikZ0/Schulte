/**
 * Lightweight XOR-stream "encryption" + checksum used as a casual anti-tamper
 * deterrent. NOT a security boundary — anyone with the source can reverse it.
 * The goal is to prevent trivial DevTools edits to localStorage and cookies.
 *
 * Uses base64 for transport. Layered with the existing FNV-1a signature in
 * persistence.ts for two-step validation.
 */

const KEY = "stt-2026-04-cipher-rotor";

function toBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function fromBytes(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // btoa is fine for ASCII binary strings.
  return typeof btoa === "function" ? btoa(bin) : bin;
}

function b64decode(s: string): Uint8Array | null {
  try {
    const bin = typeof atob === "function" ? atob(s) : s;
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function xor(input: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] ^ key[i % key.length];
  return out;
}

const PREFIX = "EX1$";

export function encryptString(plain: string): string {
  const data = toBytes(plain);
  const enc = xor(data, toBytes(KEY));
  return PREFIX + b64encode(enc);
}

export function decryptString(payload: string): string | null {
  if (!payload.startsWith(PREFIX)) return null;
  const bytes = b64decode(payload.slice(PREFIX.length));
  if (!bytes) return null;
  const decoded = xor(bytes, toBytes(KEY));
  try {
    return fromBytes(decoded);
  } catch {
    return null;
  }
}

/** True if the payload is in encrypted form. */
export function isEncrypted(payload: string): boolean {
  return payload.startsWith(PREFIX);
}
