import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

const N = 4;
const TOTAL = N * N;
const XP_WIN = 60;

/** A solvable shuffle: start solved, then make many random valid moves. */
function shuffled(): number[] {
  const tiles = Array.from({ length: TOTAL }, (_, i) => (i + 1) % TOTAL);
  let blank = TOTAL - 1;
  for (let step = 0; step < 200; step++) {
    const r = Math.floor(blank / N);
    const c = blank % N;
    const moves: number[] = [];
    if (r > 0) moves.push(blank - N);
    if (r < N - 1) moves.push(blank + N);
    if (c > 0) moves.push(blank - 1);
    if (c < N - 1) moves.push(blank + 1);
    const target = moves[Math.floor(Math.random() * moves.length)];
    [tiles[blank], tiles[target]] = [tiles[target], tiles[blank]];
    blank = target;
  }
  return tiles;
}

interface SlideScreenProps {
  onExit: () => void;
}

export function SlideScreen({ onExit }: SlideScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [tiles, setTiles] = useState<number[]>(() => shuffled());
  const [moves, setMoves] = useState(0);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const wonRef = useRef(false);

  const restart = useCallback(() => {
    setTiles(shuffled());
    setMoves(0);
    setLastXp(null);
    wonRef.current = false;
  }, []);

  const blank = tiles.indexOf(0);
  const won = useMemo(
    () => tiles.every((v, i) => (i === TOTAL - 1 ? v === 0 : v === i + 1)),
    [tiles],
  );

  useEffect(() => {
    if (won && !wonRef.current && moves > 0) {
      wonRef.current = true;
      const bonus = Math.max(10, XP_WIN - Math.max(0, moves - 80));
      const granted = awardXp(bonus);
      if (granted > 0) setLastXp(granted);
      // Higher score = fewer moves used.
      recordMinigame("slide", { won: true, score: Math.max(1, 999 - moves) });
      setConfettiTick((c) => c + 1);
      play("complete");
      haptic("success");
    }
  }, [won, moves, awardXp, play, haptic, recordMinigame]);

  const onTap = (i: number) => {
    if (won) return;
    const r = Math.floor(i / N);
    const c = i % N;
    const br = Math.floor(blank / N);
    const bc = blank % N;
    const adj = (r === br && Math.abs(c - bc) === 1) || (c === bc && Math.abs(r - br) === 1);
    if (!adj) return;
    setTiles((arr) => {
      const n = arr.slice();
      [n[blank], n[i]] = [n[i], n[blank]];
      return n;
    });
    setMoves((m) => m + 1);
    play("click");
    haptic("tap");
  };

  return (
    <main className="w-full max-w-md mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("slide.title")} subtitle={t("slide.subtitle")} onExit={onExit} />

      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("slide.moves")}
          </div>
          <div className="text-2xl font-bold tabular-nums">{moves}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("common.status")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-glow">
            {won ? "✓" : "—"}
          </div>
        </div>
      </div>

      {won && (
        <div className="rounded-2xl px-4 py-3 text-center border border-accent-success/40 bg-accent-success/10 text-accent-success">
          <div className="text-sm font-semibold">{t("slide.win")}</div>
          {lastXp != null && (
            <div className="mt-1 text-xs text-accent-neon font-semibold">+{lastXp} XP</div>
          )}
        </div>
      )}

      <section className="glass rounded-3xl p-3 sm:p-4 shadow-soft">
        <div
          className="grid mx-auto"
          style={{
            gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
            gap: "0.4rem",
            maxWidth: "min(82vmin, 420px)",
          }}
        >
          {tiles.map((v, i) => {
            const target = i + 1;
            const correct = v === target || (v === 0 && i === TOTAL - 1);
            return (
              <button
                key={i}
                onClick={() => onTap(i)}
                disabled={v === 0 || won}
                className={[
                  "aspect-square rounded-xl border border-white/10",
                  "flex items-center justify-center font-extrabold tabular-nums",
                  "text-2xl sm:text-3xl transition-all duration-200 active:scale-95",
                  v === 0
                    ? "bg-transparent border-white/5"
                    : correct
                      ? "bg-gradient-to-br from-accent-success/40 to-accent-success/15 text-accent-success shadow-[0_0_12px_rgba(34,197,94,0.18)]"
                      : "bg-gradient-to-br from-accent/30 to-accent-glow/30 text-white hover:-translate-y-0.5",
                ].join(" ")}
              >
                {v === 0 ? "" : v}
              </button>
            );
          })}
        </div>
      </section>

      <button onClick={restart} className="btn-primary">
        {t("slide.shuffle")}
      </button>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
