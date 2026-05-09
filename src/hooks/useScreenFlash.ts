import { useCallback, useState } from "react";

export type FlashKind = "success" | "fail" | "neon" | null;

interface FlashState {
  kind: FlashKind;
  /** Increments to force the overlay to remount and re-animate. */
  ticks: number;
}

/**
 * Trigger a one-shot fullscreen flash overlay (e.g. on level complete).
 */
export function useScreenFlash(): {
  flash: FlashState;
  trigger: (kind: FlashKind) => void;
} {
  const [flash, setFlash] = useState<FlashState>({ kind: null, ticks: 0 });

  const trigger = useCallback((kind: FlashKind) => {
    setFlash((prev) => ({ kind, ticks: prev.ticks + 1 }));
  }, []);

  return { flash, trigger };
}
