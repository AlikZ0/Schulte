import { getCookie, setCookie } from "./cookies";
import { decryptString, encryptString, isEncrypted } from "./encryption";

/**
 * Persistence pipeline used by SettingsContext and ProgressContext.
 *
 * Pipeline:
 *   plain JSON
 *     → wrap in signed envelope (FNV-1a signature)
 *     → encrypt with XOR (encryption.ts)
 *     → store in localStorage AND, if small enough, a backup cookie
 *
 * Read pipeline reverses the steps and falls back when localStorage is
 * unavailable, corrupted or tampered with.
 *
 * `validate(raw)` is always called and is responsible for clamping each
 * field to safe ranges. This layered approach (encryption + signature +
 * range validation) makes casual cheating impractical.
 */

const SECRET = "stt_v2_8b4f";

function sign(payload: string): string {
  let h = 0x811c9dc5;
  const data = payload + SECRET;
  for (let i = 0; i < data.length; i++) {
    h ^= data.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}

interface SignedEnvelope {
  s: string;
  v: number;
  d: unknown;
}

function envelope(data: unknown, version: number): string {
  const body = JSON.stringify(data);
  const env: SignedEnvelope = { s: sign(body), v: version, d: data };
  return JSON.stringify(env);
}

function unwrap(raw: string): unknown | null {
  // Decrypt if encrypted, otherwise fall through to legacy plaintext format.
  let working = raw;
  if (isEncrypted(raw)) {
    const decoded = decryptString(raw);
    if (decoded == null) return null;
    working = decoded;
  }
  try {
    const env = JSON.parse(working) as SignedEnvelope;
    if (!env || typeof env !== "object") return null;
    const body = JSON.stringify(env.d);
    if (sign(body) !== env.s) return null;
    return env.d;
  } catch {
    return null;
  }
}

export function loadPersisted<T>(opts: {
  key: string;
  cookieKey?: string;
  version: number;
  validate: (raw: unknown) => T;
}): T {
  const { key, cookieKey, validate } = opts;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const data = unwrap(raw);
      if (data != null) return validate(data);
    }
  } catch {
    /* fallthrough */
  }

  if (cookieKey) {
    const raw = getCookie(cookieKey);
    if (raw) {
      const data = unwrap(raw);
      if (data != null) return validate(data);
    }
  }

  return validate(undefined);
}

export function savePersisted<T>(opts: {
  key: string;
  cookieKey?: string;
  version: number;
  value: T;
}): void {
  const { key, cookieKey, version, value } = opts;
  const env = envelope(value, version);
  const encrypted = encryptString(env);

  try {
    window.localStorage.setItem(key, encrypted);
  } catch {
    /* private mode / quota */
  }

  if (cookieKey) {
    if (encrypted.length < 3500) {
      setCookie(cookieKey, encrypted, 365);
    } else {
      setCookie(cookieKey, encryptString(envelope({ overflow: true }, version)), 365);
    }
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Export / Import — used for manual backups and "cloud sync" via the user.
   ──────────────────────────────────────────────────────────────────────── */

export function exportSnapshot(values: Record<string, unknown>, version: number): string {
  const payload = { v: version, ts: Date.now(), values };
  return encryptString(envelope(payload, version));
}

export function parseSnapshot(text: string):
  | { v: number; ts: number; values: Record<string, unknown> }
  | null {
  const data = unwrap(text);
  if (!data || typeof data !== "object") return null;
  const obj = data as { v?: number; ts?: number; values?: unknown };
  if (typeof obj.v !== "number" || !obj.values || typeof obj.values !== "object")
    return null;
  return {
    v: obj.v,
    ts: typeof obj.ts === "number" ? obj.ts : 0,
    values: obj.values as Record<string, unknown>,
  };
}
