import { useCallback, useEffect, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { useSwipeGesture } from "../hooks/useSwipeGesture";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

const SIZE = 4;
const XP_WIN = 120;

type Grid = number[][];

const TILE_BG: Record<number, string> = {
  2:    "bg-white/[0.08] text-white/90",
  4:    "bg-white/[0.12] text-white",
  8:    "bg-amber-300/30 text-amber-100",
  16:   "bg-amber-400/40 text-amber-100",
  32:   "bg-orange-400/50 text-white",
  64:   "bg-orange-500/60 text-white",
  128:  "bg-rose-400/55 text-white",
  256:  "bg-rose-500/60 text-white",
  512:  "bg-fuchsia-500/60 text-white",
  1024: "bg-violet-500/65 text-white",
  2048: "bg-gradient-to-br from-amber-300 to-rose-500 text-white shadow-glow",
};

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
}

function clone(g: Grid): Grid {
  return g.map((r) => r.slice());
}

function addRandom(g: Grid): boolean {
  const empties: Array<[number, number]> = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (g[r][c] === 0) empties.push([r, c]);
  if (empties.length === 0) return false;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

/**
 * Slide and merge a single row to the left. Returns [newRow, scoreGained].
 * All four directions reduce to this primitive (rotate, slide-left, rotate back).
 */
function slideRow(row: number[]): [number[], number] {
  const filtered = row.filter((v) => v !== 0);
  let score = 0;
  const out: number[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      out.push(merged);
      score += merged;
      i += 1;
    } else {
      out.push(filtered[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  return [out, score];
}

function rotateCW(g: Grid): Grid {
  const out = emptyGrid();
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) out[c][SIZE - 1 - r] = g[r][c];
  return out;
}

function move(g: Grid, dir: "L" | "R" | "U" | "D"): { g: Grid; score: number; changed: boolean } {
  let work = clone(g);
  // Rotate so the move is always "left", then rotate back.
  const turns = dir === "L" ? 0 : dir === "U" ? 3 : dir === "R" ? 2 : 1;
  for (let i = 0; i < turns; i++) work = rotateCW(work);

  let totalScore = 0;
  let changed = false;
  for (let r = 0; r < SIZE; r++) {
    const [row, sc] = slideRow(work[r]);
    if (!changed && row.some((v, i) => v !== work[r][i])) changed = true;
    work[r] = row;
    totalScore += sc;
  }
  for (let i = 0; i < (4 - turns) % 4; i++) work = rotateCW(work);
  return { g: work, score: totalScore, changed };
}

function hasMoves(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === 0) return true;
      if (r + 1 < SIZE && g[r][c] === g[r + 1][c]) return true;
      if (c + 1 < SIZE && g[r][c] === g[r][c + 1]) return true;
    }
  return false;
}

function maxTile(g: Grid): number {
  let m = 0;
  for (const r of g) for (const v of r) if (v > m) m = v;
  return m;
}

interface Game2048ScreenProps {
  onExit: () => void;
}

export function Game2048Screen({ onExit }: Game2048ScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [grid, setGrid] = useState<Grid>(() => {
    const g = emptyGrid();
    addRandom(g);
    addRandom(g);
    return g;
  });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const wonAwardedRef = useRef(false);
  const recordedRef = useRef(false);

  const swipeRef = useRef<HTMLDivElement | null>(null);

  const restart = useCallback(() => {
    const g = emptyGrid();
    addRandom(g);
    addRandom(g);
    setGrid(g);
    setScore(0);
    setOver(false);
    setWon(false);
    setLastXp(null);
    wonAwardedRef.current = false;
    recordedRef.current = false;
  }, []);

  const tryMove = useCallback(
    (dir: "L" | "R" | "U" | "D") => {
      if (over) return;
      const result = move(grid, dir);
      if (!result.changed) return;
      addRandom(result.g);
      setGrid(result.g);
      setScore((s) => {
        const n = s + result.score;
        setBest((b) => Math.max(b, n));
        return n;
      });
      play("click");
      haptic("tap");
      if (!wonAwardedRef.current && maxTile(result.g) >= 2048) {
        wonAwardedRef.current = true;
        setWon(true);
        const granted = awardXp(XP_WIN);
        if (granted > 0) setLastXp(granted);
        setConfettiTick((c) => c + 1);
        play("complete");
        haptic("success");
      }
      if (!hasMoves(result.g) && !recordedRef.current) {
        recordedRef.current = true;
        setOver(true);
        // Score = the in-game points accumulated this round.
        recordMinigame("g2048", { won: wonAwardedRef.current, score: score + result.score });
        play("fail");
        haptic("error");
      }
    },
    [grid, over, play, haptic, awardXp, recordMinigame, score],
  );

  /* Keyboard arrows. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "L" | "R" | "U" | "D"> = {
        ArrowLeft: "L",
        ArrowRight: "R",
        ArrowUp: "U",
        ArrowDown: "D",
        a: "L",
        d: "R",
        w: "U",
        s: "D",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        tryMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryMove]);

  /* Swipe gestures inside the board only — page-level swipes are
     reserved for tab navigation. */
  useSwipeGesture(swipeRef, {
    enabled: true,
    threshold: 24,
    onSwipeLeft: () => tryMove("L"),
    onSwipeRight: () => tryMove("R"),
    onSwipeUp: () => tryMove("U"),
    onSwipeDown: () => tryMove("D"),
  });

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("g2048.title")} subtitle={t("g2048.subtitle")} onExit={onExit} />

      <section className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("common.score")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-neon">{score}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("common.best")}
          </div>
          <div className="text-2xl font-bold tabular-nums">{best}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("g2048.max")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-glow">{maxTile(grid)}</div>
        </div>
      </section>

      {(over || won) && (
        <div
          className={[
            "rounded-2xl px-4 py-3 text-center border",
            won
              ? "border-accent-success/40 bg-accent-success/10 text-accent-success"
              : "border-accent-danger/40 bg-accent-danger/10 text-rose-300",
          ].join(" ")}
        >
          <div className="text-sm font-semibold">
            {won ? t("g2048.win") : t("g2048.lose")}
          </div>
          {lastXp != null && (
            <div className="mt-1 text-xs text-accent-neon font-semibold animate-fade-in">
              +{lastXp} XP
            </div>
          )}
        </div>
      )}

      <section ref={swipeRef} className="glass rounded-3xl p-3 sm:p-4 shadow-soft" style={{ touchAction: "none" }}>
        <div
          className="grid w-full max-w-[min(82vmin,440px)] mx-auto"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, gap: "0.5rem" }}
        >
          {grid.flatMap((row, r) =>
            row.map((v, c) => (
              <div
                key={`${r}-${c}`}
                className={[
                  "aspect-square rounded-xl border border-white/10 flex items-center justify-center",
                  "font-extrabold tabular-nums transition-all duration-150",
                  v === 0 ? "bg-white/[0.03]" : TILE_BG[v] ?? "bg-white/20 text-white",
                  v >= 1024 ? "text-base sm:text-lg" : v >= 128 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
                ].join(" ")}
              >
                {v === 0 ? "" : v}
              </div>
            )),
          )}
        </div>
      </section>

      {/* On-screen direction pad for users without keyboard / unsure of swipes. */}
      <div className="glass rounded-2xl p-3 grid grid-cols-3 gap-2 max-w-xs mx-auto">
        <div />
        <button onClick={() => tryMove("U")} className="btn-ghost h-12">↑</button>
        <div />
        <button onClick={() => tryMove("L")} className="btn-ghost h-12">←</button>
        <button onClick={() => tryMove("D")} className="btn-ghost h-12">↓</button>
        <button onClick={() => tryMove("R")} className="btn-ghost h-12">→</button>
      </div>

      <button onClick={restart} className="btn-primary">
        {t("common.restart")}
      </button>
      <p className="text-xs text-white/45 text-center">{t("g2048.tip")}</p>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
