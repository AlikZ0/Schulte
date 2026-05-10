import { useCallback, useEffect, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

const ROUND_MS = 60_000;

interface Problem {
  text: string;
  answer: number;
  options: number[];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildProblem(): Problem {
  const op = ["+", "-", "×", "÷"][Math.floor(Math.random() * 4)];
  let a: number;
  let b: number;
  let answer: number;
  let text: string;
  switch (op) {
    case "+":
      a = randInt(2, 99);
      b = randInt(2, 99);
      answer = a + b;
      text = `${a} + ${b}`;
      break;
    case "-":
      a = randInt(20, 99);
      b = randInt(2, a - 1);
      answer = a - b;
      text = `${a} − ${b}`;
      break;
    case "×":
      a = randInt(2, 12);
      b = randInt(2, 12);
      answer = a * b;
      text = `${a} × ${b}`;
      break;
    default: {
      // ÷: build divisible pairs.
      const factor = randInt(2, 12);
      const product = factor * randInt(2, 12);
      a = product;
      b = factor;
      answer = product / factor;
      text = `${a} ÷ ${b}`;
    }
  }
  // Build 4 options including the correct answer.
  const opts = new Set<number>([answer]);
  while (opts.size < 4) {
    const drift = randInt(-9, 9);
    const v = Math.max(0, answer + drift);
    if (v !== answer) opts.add(v);
  }
  const options = [...opts].sort(() => Math.random() - 0.5);
  return { text, answer, options };
}

interface MathScreenProps {
  onExit: () => void;
}

export function MathScreen({ onExit }: MathScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [problem, setProblem] = useState<Problem>(() => buildProblem());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(ROUND_MS);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const tickRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    setRunning(false);
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setLastXp(null);
    setProblem(buildProblem());
    setRemaining(ROUND_MS);
    setRunning(true);
    play("click");
  }, [play]);

  useEffect(() => {
    if (!running) return;
    const startTs = performance.now();
    tickRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startTs;
      const left = Math.max(0, ROUND_MS - elapsed);
      setRemaining(left);
      if (left <= 0) {
        stop();
        const granted = awardXp(score * 2 + bestStreak);
        if (granted > 0) setLastXp(granted);
        // Score = correct answers in 60s; "won" = at least one solved.
        recordMinigame("math", { won: score > 0, score });
        if (score > 0) setConfettiTick((c) => c + 1);
        play("complete");
        haptic("success");
      }
    }, 100);
    return stop;
  }, [running, score, bestStreak, awardXp, play, haptic, stop, recordMinigame]);

  const onAnswer = (v: number) => {
    if (!running) return;
    if (v === problem.answer) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      play("correct");
      haptic("tap");
    } else {
      setStreak(0);
      play("wrong");
      haptic("warning");
    }
    setProblem(buildProblem());
  };

  return (
    <main className="w-full max-w-md mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("math.title")} subtitle={t("math.subtitle")} onExit={onExit} />

      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("game.time")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-neon">
            {Math.ceil(remaining / 1000)}s
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("common.score")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-success">
            {score}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("math.streak")}
          </div>
          <div className="text-2xl font-bold tabular-nums">{streak}</div>
        </div>
      </div>

      {!running && lastXp != null && (
        <div className="rounded-2xl px-4 py-3 text-center border border-accent-success/40 bg-accent-success/10 text-accent-success">
          <div className="text-sm font-semibold">
            {t("math.finished")}: {score} · best streak {bestStreak}
          </div>
          <div className="mt-1 text-xs text-accent-neon font-semibold">+{lastXp} XP</div>
        </div>
      )}

      <section className="glass rounded-3xl p-6 sm:p-8 shadow-soft text-center">
        <div className="text-5xl sm:text-6xl font-extrabold tabular-nums tracking-tight">
          {running ? problem.text : "—"}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        {(running ? problem.options : [0, 0, 0, 0]).map((v, i) => (
          <button
            key={i}
            onClick={() => onAnswer(v)}
            disabled={!running}
            className="btn-ghost h-14 text-2xl font-bold tabular-nums disabled:opacity-30"
          >
            {running ? v : "?"}
          </button>
        ))}
      </div>

      <button onClick={running ? stop : start} className="btn-primary">
        {running ? t("common.cancel") : t("math.start")}
      </button>
      <p className="text-xs text-white/45 text-center">{t("math.tip")}</p>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
