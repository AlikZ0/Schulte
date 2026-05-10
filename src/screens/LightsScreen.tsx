import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

const N = 5;
const XP_WIN = 50;

/** Generate a solvable random board: start all-off, then press random cells. */
function buildBoard(): boolean[] {
  const b = new Array(N * N).fill(false);
  const presses = 6 + Math.floor(Math.random() * 5);
  for (let i = 0; i < presses; i++) {
    const idx = Math.floor(Math.random() * N * N);
    toggle(b, idx);
  }
  return b;
}

function toggle(b: boolean[], idx: number) {
  const r = Math.floor(idx / N);
  const c = idx % N;
  for (const [dr, dc] of [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
    b[rr * N + cc] = !b[rr * N + cc];
  }
}

interface LightsScreenProps {
  onExit: () => void;
}

export function LightsScreen({ onExit }: LightsScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [board, setBoard] = useState<boolean[]>(() => buildBoard());
  const [moves, setMoves] = useState(0);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const wonRef = useRef(false);

  const reset = useCallback(() => {
    setBoard(buildBoard());
    setMoves(0);
    setLastXp(null);
    wonRef.current = false;
  }, []);

  const won = useMemo(() => board.every((v) => !v), [board]);

  useEffect(() => {
    if (won && !wonRef.current && moves > 0) {
      wonRef.current = true;
      const granted = awardXp(Math.max(15, XP_WIN - Math.max(0, moves - 12) * 2));
      if (granted > 0) setLastXp(granted);
      // Higher score = fewer moves used.
      recordMinigame("lights", { won: true, score: Math.max(1, 999 - moves) });
      setConfettiTick((c) => c + 1);
      play("complete");
      haptic("success");
    }
  }, [won, moves, awardXp, play, haptic, recordMinigame]);

  const onCell = (i: number) => {
    if (won) return;
    setBoard((b) => {
      const n = b.slice();
      toggle(n, i);
      return n;
    });
    setMoves((m) => m + 1);
    play("click");
    haptic("tap");
  };

  return (
    <main className="w-full max-w-md mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("lights.title")} subtitle={t("lights.subtitle")} onExit={onExit} />

      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("slide.moves")}
          </div>
          <div className="text-2xl font-bold tabular-nums">{moves}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("lights.lit")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-300">
            {board.filter(Boolean).length}
          </div>
        </div>
      </div>

      {won && (
        <div className="rounded-2xl px-4 py-3 text-center border border-accent-success/40 bg-accent-success/10 text-accent-success">
          <div className="text-sm font-semibold">{t("lights.win")}</div>
          {lastXp != null && (
            <div className="mt-1 text-xs text-accent-neon font-semibold">+{lastXp} XP</div>
          )}
        </div>
      )}

      <section className="glass rounded-3xl p-3 sm:p-4 shadow-soft mx-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
            gap: "0.4rem",
            maxWidth: "min(82vmin, 380px)",
          }}
        >
          {board.map((on, i) => (
            <button
              key={i}
              onClick={() => onCell(i)}
              disabled={won}
              className={[
                "aspect-square rounded-xl border border-white/10 transition-all duration-200",
                "flex items-center justify-center text-2xl active:scale-95",
                on
                  ? "bg-gradient-to-br from-amber-300 to-orange-500 text-bg shadow-[0_0_22px_rgba(251,191,36,0.55)]"
                  : "bg-white/[0.04] text-white/35 hover:bg-white/[0.08]",
              ].join(" ")}
            >
              {on ? "✦" : ""}
            </button>
          ))}
        </div>
      </section>

      <button onClick={reset} className="btn-primary">
        {t("lights.new_puzzle")}
      </button>
      <p className="text-xs text-white/45 text-center">{t("lights.tip")}</p>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
