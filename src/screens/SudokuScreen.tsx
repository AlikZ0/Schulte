import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

const N = 4; // 4×4 Sudoku with 2×2 boxes
const XP_WIN = 50;

type Cell = number; // 0 = empty, 1..4 = filled
type Board = Cell[];

function idx(r: number, c: number) {
  return r * N + c;
}

function isValid(b: Board, r: number, c: number, v: number): boolean {
  for (let i = 0; i < N; i++) {
    if (i !== c && b[idx(r, i)] === v) return false;
    if (i !== r && b[idx(i, c)] === v) return false;
  }
  const br = Math.floor(r / 2) * 2;
  const bc = Math.floor(c / 2) * 2;
  for (let dr = 0; dr < 2; dr++)
    for (let dc = 0; dc < 2; dc++) {
      const rr = br + dr;
      const cc = bc + dc;
      if ((rr !== r || cc !== c) && b[idx(rr, cc)] === v) return false;
    }
  return true;
}

function solve(b: Board): boolean {
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (b[idx(r, c)] === 0) {
        const order = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
        for (const v of order) {
          if (isValid(b, r, c, v)) {
            b[idx(r, c)] = v;
            if (solve(b)) return true;
            b[idx(r, c)] = 0;
          }
        }
        return false;
      }
    }
  return true;
}

function generate(): { puzzle: Board; solution: Board; clues: Set<number> } {
  const sol: Board = new Array(N * N).fill(0);
  solve(sol);
  const puzzle = sol.slice();
  const cellsToHide = 7; // out of 16 — leaves 9 clues, balanced difficulty
  const indices = [...Array(N * N).keys()].sort(() => Math.random() - 0.5);
  for (let i = 0; i < cellsToHide; i++) puzzle[indices[i]] = 0;
  const clues = new Set<number>();
  for (let i = 0; i < N * N; i++) if (puzzle[i] !== 0) clues.add(i);
  return { puzzle, solution: sol, clues };
}

interface SudokuScreenProps {
  onExit: () => void;
}

export function SudokuScreen({ onExit }: SudokuScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [puzzle, setPuzzle] = useState<Board>(() => generate().puzzle);
  const [solution, setSolution] = useState<Board>(() => puzzle.slice());
  const [clues, setClues] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const wonRef = useRef(false);

  const newGame = useCallback(() => {
    const g = generate();
    setPuzzle(g.puzzle);
    setSolution(g.solution);
    setClues(g.clues);
    setSelected(null);
    setMistakes(0);
    setLastXp(null);
    wonRef.current = false;
  }, []);

  // Initialize on first mount.
  useEffect(() => {
    newGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const won = useMemo(
    () => puzzle.every((v, i) => v !== 0 && v === solution[i]),
    [puzzle, solution],
  );

  useEffect(() => {
    if (won && !wonRef.current) {
      wonRef.current = true;
      const granted = awardXp(Math.max(10, XP_WIN - mistakes * 5));
      if (granted > 0) setLastXp(granted);
      recordMinigame("sudoku", { won: true, score: Math.max(1, 100 - mistakes * 10) });
      setConfettiTick((c) => c + 1);
      play("complete");
      haptic("success");
    }
  }, [won, mistakes, awardXp, play, haptic, recordMinigame]);

  const onCell = (i: number) => {
    if (clues.has(i) || won) return;
    setSelected(i);
  };

  const onPad = (v: number) => {
    if (selected == null || won) return;
    if (clues.has(selected)) return;
    setPuzzle((p) => {
      const n = p.slice();
      n[selected] = v;
      return n;
    });
    if (v !== 0 && v !== solution[selected]) {
      setMistakes((m) => m + 1);
      play("wrong");
      haptic("warning");
    } else {
      play("click");
      haptic("tap");
    }
  };

  return (
    <main className="w-full max-w-md mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("sudoku.title")} subtitle={t("sudoku.subtitle")} onExit={onExit} />

      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("game.mistakes")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-danger">
            {mistakes}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("common.progress")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-success">
            {puzzle.filter((v) => v !== 0).length}/{N * N}
          </div>
        </div>
      </div>

      {won && (
        <div className="rounded-2xl px-4 py-3 text-center border border-accent-success/40 bg-accent-success/10 text-accent-success">
          <div className="text-sm font-semibold">{t("sudoku.win")}</div>
          {lastXp != null && (
            <div className="mt-1 text-xs text-accent-neon font-semibold">
              +{lastXp} XP
            </div>
          )}
        </div>
      )}

      <section className="glass rounded-3xl p-3 sm:p-4 shadow-soft mx-auto">
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`, gap: "2px" }}
        >
          {puzzle.map((v, i) => {
            const r = Math.floor(i / N);
            const c = i % N;
            const boxBoundary =
              (r === 1 ? "border-b-2 border-b-accent/50 " : "") +
              (c === 1 ? "border-r-2 border-r-accent/50 " : "");
            const isClue = clues.has(i);
            const isSel = selected === i;
            const isWrong = v !== 0 && v !== solution[i];
            return (
              <button
                key={i}
                onClick={() => onCell(i)}
                disabled={isClue || won}
                className={[
                  "aspect-square w-14 sm:w-16 rounded-md border border-white/10",
                  "flex items-center justify-center text-2xl sm:text-3xl font-bold tabular-nums",
                  "transition-colors duration-150",
                  boxBoundary,
                  isClue
                    ? "bg-white/[0.08] text-white"
                    : isWrong
                      ? "bg-accent-danger/20 text-accent-danger"
                      : isSel
                        ? "bg-accent/30 text-white ring-2 ring-accent"
                        : "bg-white/[0.03] text-accent-glow hover:bg-white/[0.06]",
                ].join(" ")}
              >
                {v === 0 ? "" : v}
              </button>
            );
          })}
        </div>
      </section>

      {/* Number pad */}
      <div className="flex justify-center gap-2 flex-wrap">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => onPad(n)}
            disabled={selected == null || won}
            className="btn-ghost h-12 w-12 text-xl font-bold"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onPad(0)}
          disabled={selected == null || won}
          className="btn-ghost h-12 w-12 text-base"
          aria-label={t("common.clear")}
        >
          ⌫
        </button>
      </div>

      <button onClick={newGame} className="btn-primary">
        {t("sudoku.new_puzzle")}
      </button>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
