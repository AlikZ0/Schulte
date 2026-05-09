import { useCallback } from "react";

type HapticPattern = "tap" | "success" | "warning" | "error" | "heavy";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [20, 30, 30],
  warning: [40, 40],
  error: [50, 30, 50],
  heavy: 60,
};

/**
 * Triggers vibration via the (web) Vibration API. Silently no-ops on
 * platforms that don't support it. Wrap calls so they're cheap.
 */
export function useHaptics(enabled: boolean) {
  return useCallback(
    (pattern: HapticPattern) => {
      if (!enabled) return;
      if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
      try {
        navigator.vibrate(PATTERNS[pattern]);
      } catch {
        /* ignore — some browsers throw without a user gesture */
      }
    },
    [enabled],
  );
}
