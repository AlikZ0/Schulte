export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === "undefined") return;
  try {
    const maxAge = days * 24 * 60 * 60;
    const encoded = encodeURIComponent(value);
    document.cookie = `${name}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const cookies = document.cookie ? document.cookie.split("; ") : [];
    for (const c of cookies) {
      const eq = c.indexOf("=");
      if (eq < 0) continue;
      const k = c.slice(0, eq);
      if (k === name) return decodeURIComponent(c.slice(eq + 1));
    }
    return null;
  } catch {
    return null;
  }
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}
