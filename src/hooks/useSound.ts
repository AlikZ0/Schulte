import { useCallback, useEffect, useRef } from "react";

type SoundKind = "correct" | "wrong" | "complete" | "fail" | "click" | "unlock";

/**
 * Tiny synthesizer using the Web Audio API. No external samples required.
 */
export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const blip = useCallback(
    (
      freq: number,
      durationMs: number,
      type: OscillatorType = "sine",
      gain = 0.08
    ) => {
      if (!enabled) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      osc.start(now);
      osc.stop(now + durationMs / 1000 + 0.02);
    },
    [enabled, ensureCtx]
  );

  const play = useCallback(
    (kind: SoundKind) => {
      if (!enabled) return;
      switch (kind) {
        case "click":
          blip(660, 60, "sine", 0.04);
          break;
        case "correct":
          blip(880, 110, "triangle", 0.06);
          break;
        case "wrong":
          blip(180, 180, "sawtooth", 0.05);
          break;
        case "fail":
          blip(220, 240, "sawtooth", 0.06);
          setTimeout(() => blip(160, 280, "sawtooth", 0.06), 120);
          break;
        case "complete": {
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((n, i) =>
            setTimeout(() => blip(n, 220, "triangle", 0.07), i * 110)
          );
          break;
        }
        case "unlock": {
          blip(987.77, 130, "triangle", 0.05);
          setTimeout(() => blip(1318.51, 200, "triangle", 0.06), 90);
          break;
        }
      }
    },
    [enabled, blip]
  );

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx && ctx.state !== "closed")
        void ctx.close().catch(() => undefined);
    };
  }, []);

  return { play };
}
