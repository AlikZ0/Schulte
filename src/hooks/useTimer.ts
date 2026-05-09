import { useCallback, useEffect, useRef, useState } from "react";

/**
 * High-precision stopwatch driven by requestAnimationFrame.
 * Exposes `bump(ms)` for inflicting time penalties on wrong clicks.
 */
export function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef<number | null>(null);
  const accumRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const penaltyRef = useRef(0);

  const tick = useCallback(() => {
    if (startRef.current == null) return;
    const now = performance.now();
    setElapsed(accumRef.current + penaltyRef.current + (now - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (running) return;
    startRef.current = performance.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [running, tick]);

  const stop = useCallback(() => {
    if (!running) return elapsed;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (startRef.current != null) {
      accumRef.current += performance.now() - startRef.current;
      startRef.current = null;
    }
    setRunning(false);
    const final = accumRef.current + penaltyRef.current;
    setElapsed(final);
    return final;
  }, [running, elapsed]);

  const reset = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    accumRef.current = 0;
    penaltyRef.current = 0;
    setElapsed(0);
    setRunning(false);
  }, []);

  const bump = useCallback((ms: number) => {
    penaltyRef.current += ms;
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { elapsed, running, start, stop, reset, bump };
}
