/**
 * Registers the service worker and exposes a small event-emitter style API
 * so React can show an "Update available" banner without coupling.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let updateReady: ServiceWorkerRegistration | null = null;

export function onUpdateReady(fn: Listener): () => void {
  listeners.add(fn);
  if (updateReady) fn();
  return () => listeners.delete(fn);
}

function emitUpdateReady(reg: ServiceWorkerRegistration) {
  updateReady = reg;
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore subscriber errors */
    }
  });
}

export function applyUpdate(): void {
  const reg = updateReady;
  if (!reg || !reg.waiting) {
    window.location.reload();
    return;
  }
  reg.waiting.postMessage({ type: "SKIP_WAITING" });
  // Reload once the new SW takes control.
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => window.location.reload(),
    { once: true },
  );
}

export function registerSW(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return; // skip in dev to avoid stale-cache pain

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (reg.waiting) emitUpdateReady(reg);

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              emitUpdateReady(reg);
            }
          });
        });
      })
      .catch(() => {
        /* ignore registration failures */
      });
  });
}
