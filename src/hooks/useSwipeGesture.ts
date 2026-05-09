import { useEffect, useRef } from "react";

interface Options {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** Minimum horizontal distance to trigger (px). */
  threshold?: number;
  /** Maximum cross-axis drift to still count as a horizontal swipe. */
  axisLock?: number;
  /** Maximum gesture duration to count (ms). */
  maxDuration?: number;
  enabled?: boolean;
}

/**
 * Lightweight swipe-gesture detector. Use on a ref to opt into per-element
 * gestures, or call without target to listen on document.
 */
export function useSwipeGesture(target: React.RefObject<HTMLElement> | null, opts: Options) {
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    const el: HTMLElement | Document =
      (target && target.current) || (typeof document !== "undefined" ? document : (null as never));
    if (!el) return;

    const enabled = ref.current.enabled !== false;
    if (!enabled) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startT = performance.now();
      active = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = performance.now() - startT;
      const threshold = ref.current.threshold ?? 60;
      const axisLock = ref.current.axisLock ?? 60;
      const maxDuration = ref.current.maxDuration ?? 600;
      if (dt > maxDuration) return;

      if (Math.abs(dx) >= threshold && Math.abs(dy) <= axisLock) {
        if (dx < 0) ref.current.onSwipeLeft?.();
        else ref.current.onSwipeRight?.();
        return;
      }
      if (Math.abs(dy) >= threshold && Math.abs(dx) <= axisLock) {
        if (dy < 0) ref.current.onSwipeUp?.();
        else ref.current.onSwipeDown?.();
      }
    };

    el.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    el.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart as EventListener);
      el.removeEventListener("touchend", onTouchEnd as EventListener);
    };
  }, [target]);
}
