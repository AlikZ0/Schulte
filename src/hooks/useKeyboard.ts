import { useEffect } from "react";

interface KeyboardOptions {
  onNumber?: (value: number) => void;
  onRestart?: () => void;
  onToggleSound?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboard({
  onNumber,
  onRestart,
  onToggleSound,
  onEscape,
  enabled = true,
}: KeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    let buffer = "";
    let timer: number | null = null;

    const flush = () => {
      if (buffer.length === 0) return;
      const n = parseInt(buffer, 10);
      buffer = "";
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (Number.isFinite(n) && onNumber) onNumber(n);
    };

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;

      if (e.key >= "0" && e.key <= "9") {
        buffer += e.key;
        if (timer != null) window.clearTimeout(timer);
        timer = window.setTimeout(flush, 450);
        e.preventDefault();
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        if (buffer.length > 0) {
          flush();
          e.preventDefault();
        }
        return;
      }

      if (e.key === "Escape") {
        if (onEscape) {
          onEscape();
          e.preventDefault();
        }
        return;
      }

      if (e.key.toLowerCase() === "r") {
        if (onRestart) {
          onRestart();
          e.preventDefault();
        }
        return;
      }

      if (e.key.toLowerCase() === "m") {
        if (onToggleSound) {
          onToggleSound();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (timer != null) window.clearTimeout(timer);
    };
  }, [enabled, onNumber, onRestart, onToggleSound, onEscape]);
}
