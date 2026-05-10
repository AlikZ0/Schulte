import { useCallback, useEffect, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

type Pad = 0 | 1 | 2 | 3;
type Phase = "idle" | "showing" | "input" | "lost";

const PAD_LABELS = ["◓", "◑", "◐", "◒"];
const PAD_COLORS = [
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-rose-600",
  "from-sky-400 to-cyan-500",
  "from-amber-300 to-orange-500",
];
const FREQ = [261.63, 329.63, 392.0, 523.25];

interface SimonScreenProps {
  onExit: () => void;
}

export function SimonScreen({ onExit }: SimonScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [sequence, setSequence] = useState<Pad[]>([]);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [highlight, setHighlight] = useState<Pad | null>(null);
  const [bestRound, setBestRound] = useState(0);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const timerRef = useRef<number | null>(null);

  const cancelTimers = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  /* ── Synth blip per pad ─────────────────────────────────────────────── */
  const audioRef = useRef<AudioContext | null>(null);
  const blip = useCallback(
    (pad: Pad) => {
      if (!settings.sound) return;
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!audioRef.current) audioRef.current = new Ctor();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = FREQ[pad];
      g.gain.value = 0.07;
      osc.connect(g).connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.07, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.36);
    },
    [settings.sound],
  );

  /* ── Show the current sequence ──────────────────────────────────────── */
  const showSequence = useCallback(
    (seq: Pad[]) => {
      let i = 0;
      const tick = () => {
        if (i >= seq.length) {
          setHighlight(null);
          setPhase("input");
          setPos(0);
          return;
        }
        const pad = seq[i++];
        setHighlight(pad);
        blip(pad);
        timerRef.current = window.setTimeout(() => {
          setHighlight(null);
          timerRef.current = window.setTimeout(tick, 180);
        }, 380);
      };
      setPhase("showing");
      timerRef.current = window.setTimeout(tick, 480);
    },
    [blip],
  );

  const startGame = useCallback(() => {
    cancelTimers();
    const first: Pad = Math.floor(Math.random() * 4) as Pad;
    setSequence([first]);
    setLastXp(null);
    showSequence([first]);
  }, [showSequence]);

  const onPad = (pad: Pad) => {
    if (phase !== "input") return;
    setHighlight(pad);
    blip(pad);
    haptic("tap");
    timerRef.current = window.setTimeout(() => setHighlight(null), 180);

    if (sequence[pos] !== pad) {
      cancelTimers();
      setPhase("lost");
      const reached = sequence.length - 1;
      setBestRound((b) => Math.max(b, reached));
      const granted = awardXp(reached * 4);
      if (granted > 0) setLastXp(granted);
      // Higher score = farther round reached. "Won" if at least 3 rounds.
      recordMinigame("simon", { won: reached >= 3, score: reached });
      if (reached >= 3) setConfettiTick((c) => c + 1);
      play("fail");
      haptic("error");
      return;
    }
    if (pos + 1 >= sequence.length) {
      timerRef.current = window.setTimeout(() => {
        const next: Pad = Math.floor(Math.random() * 4) as Pad;
        const seq = [...sequence, next];
        setSequence(seq);
        showSequence(seq);
      }, 600);
      play("correct");
    } else {
      setPos((p) => p + 1);
    }
  };

  useEffect(() => () => cancelTimers(), []);

  return (
    <main className="w-full max-w-md mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("simon.title")} subtitle={t("simon.subtitle")} onExit={onExit} />

      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("simon.round")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-neon">
            {sequence.length}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("simon.best")}
          </div>
          <div className="text-2xl font-bold tabular-nums">{bestRound}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("common.status")}
          </div>
          <div className="text-sm font-semibold mt-1">
            {phase === "showing"
              ? t("simon.watch")
              : phase === "input"
                ? t("simon.repeat")
                : phase === "lost"
                  ? t("simon.lost")
                  : "—"}
          </div>
        </div>
      </div>

      {phase === "lost" && lastXp != null && (
        <div className="rounded-2xl px-4 py-3 text-center border border-accent-danger/40 bg-accent-danger/10 text-rose-300">
          <div className="text-sm font-semibold">
            {t("simon.lost")} · {sequence.length - 1}
          </div>
          <div className="mt-1 text-xs text-accent-neon font-semibold">+{lastXp} XP</div>
        </div>
      )}

      <section className="glass rounded-3xl p-3 sm:p-4 shadow-soft mx-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0.6rem",
            maxWidth: "min(82vmin, 360px)",
          }}
        >
          {([0, 1, 2, 3] as Pad[]).map((p) => {
            const lit = highlight === p;
            return (
              <button
                key={p}
                onClick={() => onPad(p)}
                disabled={phase !== "input"}
                className={[
                  "aspect-square rounded-3xl border border-white/15 flex items-center justify-center",
                  "text-5xl font-bold transition-all duration-150 select-none",
                  "bg-gradient-to-br",
                  PAD_COLORS[p],
                  lit ? "scale-105 shadow-[0_0_44px_rgba(255,255,255,0.45)] brightness-150" : "brightness-75",
                ].join(" ")}
              >
                {PAD_LABELS[p]}
              </button>
            );
          })}
        </div>
      </section>

      <button onClick={startGame} className="btn-primary">
        {phase === "idle" || phase === "lost" ? t("simon.start") : t("simon.restart")}
      </button>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
