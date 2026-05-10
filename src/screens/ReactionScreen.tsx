import { useCallback, useEffect, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

const TRIALS = 5;

type Phase = "idle" | "wait" | "go" | "early" | "result" | "done";

interface ReactionScreenProps {
  onExit: () => void;
}

export function ReactionScreen({ onExit }: ReactionScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [phase, setPhase] = useState<Phase>("idle");
  const [trial, setTrial] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const startTsRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    setPhase("idle");
    setTrial(0);
    setTimes([]);
    setLast(null);
    setLastXp(null);
  }, []);

  const startTrial = useCallback(() => {
    setPhase("wait");
    setLast(null);
    const delay = 800 + Math.random() * 2500;
    timerRef.current = window.setTimeout(() => {
      startTsRef.current = performance.now();
      setPhase("go");
      play("correct");
    }, delay);
  }, [play]);

  const onTap = useCallback(() => {
    if (phase === "idle" || phase === "result" || phase === "done") {
      // Begin / continue.
      if (phase === "idle") {
        setTimes([]);
        setTrial(0);
      }
      startTrial();
      return;
    }
    if (phase === "wait") {
      // Pressed too early.
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      setPhase("early");
      play("wrong");
      haptic("warning");
      return;
    }
    if (phase === "go") {
      const ms = Math.round(performance.now() - startTsRef.current);
      setLast(ms);
      const next = [...times, ms];
      setTimes(next);
      const newTrial = trial + 1;
      setTrial(newTrial);
      haptic("tap");
      if (newTrial >= TRIALS) {
        const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length);
        // Reward: faster = more XP. 200ms ≈ 60 XP, 400ms ≈ 30 XP, 800ms ≈ 5 XP.
        const xp = Math.max(5, Math.round(80 - avg / 12));
        const granted = awardXp(xp);
        if (granted > 0) setLastXp(granted);
        // Higher score = faster avg. Cap at 1000 (1 ms ≈ 999 score).
        const score = Math.max(1, 1000 - avg);
        recordMinigame("reaction", { won: avg < 400, score });
        if (avg < 400) setConfettiTick((c) => c + 1);
        setPhase("done");
        play("complete");
        haptic("success");
      } else {
        setPhase("result");
      }
    } else if (phase === "early") {
      // From early state, single tap restarts the trial without losing progress.
      startTrial();
    }
  }, [phase, trial, times, startTrial, awardXp, play, haptic, recordMinigame]);

  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
  }, []);

  const avg = times.length > 0
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : 0;

  let bgClass: string;
  let label: string;
  switch (phase) {
    case "idle":
      bgClass = "bg-gradient-to-br from-accent/30 to-accent-glow/20";
      label = t("reaction.tap_to_start");
      break;
    case "wait":
      bgClass = "bg-gradient-to-br from-rose-500/40 to-rose-700/40";
      label = t("reaction.wait");
      break;
    case "go":
      bgClass = "bg-gradient-to-br from-emerald-300 to-emerald-600 text-bg shadow-[0_0_60px_rgba(34,197,94,0.5)]";
      label = "TAP!";
      break;
    case "early":
      bgClass = "bg-gradient-to-br from-amber-400 to-orange-600 text-bg";
      label = t("reaction.too_early");
      break;
    case "result":
      bgClass = "bg-gradient-to-br from-accent/30 to-accent-glow/20";
      label = `${last} ms — ${t("reaction.tap_for_next")}`;
      break;
    default:
      bgClass = "bg-gradient-to-br from-accent-success/40 to-accent-success/15 text-accent-success";
      label = `${t("reaction.average")}: ${avg} ms`;
  }

  return (
    <main className="w-full max-w-md mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("reaction.title")} subtitle={t("reaction.subtitle")} onExit={onExit} />

      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("reaction.trial")}
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {Math.min(trial, TRIALS)}/{TRIALS}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("reaction.last")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-neon">
            {last ?? "—"}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("reaction.average")}
          </div>
          <div className="text-2xl font-bold tabular-nums">{times.length > 0 ? avg : "—"}</div>
        </div>
      </div>

      {phase === "done" && lastXp != null && (
        <div className="rounded-2xl px-4 py-3 text-center border border-accent-success/40 bg-accent-success/10 text-accent-success">
          <div className="text-sm font-semibold">{t("reaction.done")}</div>
          <div className="mt-1 text-xs text-accent-neon font-semibold">+{lastXp} XP</div>
        </div>
      )}

      <button
        type="button"
        onClick={onTap}
        className={[
          "rounded-3xl border border-white/15 shadow-soft min-h-[260px] flex items-center justify-center",
          "text-2xl sm:text-3xl font-extrabold transition-all select-none active:scale-[0.98]",
          bgClass,
        ].join(" ")}
      >
        {label}
      </button>

      <button onClick={reset} className="btn-ghost">
        {t("common.restart")}
      </button>
      <p className="text-xs text-white/45 text-center">{t("reaction.tip")}</p>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
