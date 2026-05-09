import { useEffect, useRef } from "react";

/**
 * Looping ambient pad with dynamic intensity. The intensity value (0..1)
 * is interpreted as combo strength and modulates pad volume + a high-freq
 * shimmer layer.
 */
export function useMusic(enabled: boolean, intensity = 0) {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{
    master: GainNode;
    shimmer: GainNode;
    oscs: OscillatorNode[];
    lfo: OscillatorNode;
  } | null>(null);
  const intensityRef = useRef(intensity);

  // Keep ref current so the rAF loop can read latest value without re-binding.
  intensityRef.current = intensity;

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!enabled) {
      const nodes = nodesRef.current;
      const ctx = ctxRef.current;
      if (nodes && ctx) {
        try {
          nodes.master.gain.cancelScheduledValues(ctx.currentTime);
          nodes.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45);
          nodes.shimmer.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45);
          nodes.oscs.forEach((o) => o.stop(ctx.currentTime + 0.55));
          nodes.lfo.stop(ctx.currentTime + 0.55);
        } catch {
          /* ignore */
        }
        nodesRef.current = null;
      }
      return;
    }

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    if (!ctxRef.current) ctxRef.current = new Ctor();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const shimmer = ctx.createGain();
    shimmer.gain.value = 0;
    shimmer.connect(ctx.destination);

    // Pad layer.
    const padFreqs = [130.81, 196, 261.63, 329.63, 392];
    const oscs = padFreqs.map((freq, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 === 0 ? "sine" : "triangle";
      o.frequency.value = freq;
      o.detune.value = (Math.random() - 0.5) * 6;
      const g = ctx.createGain();
      g.gain.value = 0.05 / (i + 1);
      o.connect(g).connect(master);
      o.start();
      return o;
    });

    // Shimmer layer (high-freq, intensity-driven).
    const shimOsc = ctx.createOscillator();
    shimOsc.type = "sine";
    shimOsc.frequency.value = 1568; // G6
    shimOsc.connect(shimmer);
    shimOsc.start();
    oscs.push(shimOsc);

    // Slow LFO that breathes the master gain.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();

    master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.6);

    nodesRef.current = { master, shimmer, oscs, lfo };

    // Smoothly track intensity each frame.
    let raf = 0;
    const loop = () => {
      const nodes = nodesRef.current;
      if (!nodes) return;
      const i = Math.max(0, Math.min(1, intensityRef.current));
      const targetMaster = 0.05 + i * 0.06;
      const targetShim = i * 0.04;
      try {
        nodes.master.gain.setTargetAtTime(targetMaster, ctx.currentTime, 0.5);
        nodes.shimmer.gain.setTargetAtTime(targetShim, ctx.currentTime, 0.5);
      } catch {
        /* ignore */
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      const nodes = nodesRef.current;
      if (!nodes) return;
      try {
        nodes.master.gain.cancelScheduledValues(ctx.currentTime);
        nodes.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45);
        nodes.shimmer.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45);
        nodes.oscs.forEach((o) => o.stop(ctx.currentTime + 0.55));
        nodes.lfo.stop(ctx.currentTime + 0.55);
      } catch {
        /* ignore */
      }
      nodesRef.current = null;
    };
  }, [enabled]);
}
