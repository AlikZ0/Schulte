import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { Confetti } from "../components/Confetti";
import type { TranslationKey } from "../i18n";

/* XP awarded for each mini-game outcome — small but meaningful. */
const XP_WIN = 30;
const XP_DRAW = 5;

type Cell = "X" | "O" | null;
type Player = "X" | "O";
type GameState = "playing" | "won" | "lost" | "draw";

const WIN_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: Cell[]): { winner: Player | null; line: readonly number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a] as Player, line };
    }
  }
  return { winner: null, line: null };
}

function isFull(board: Cell[]): boolean {
  return board.every((c) => c !== null);
}

/**
 * Pure minimax — Tic-tac-toe is a 9-cell game so the entire tree is tiny
 * (≤ ~5500 leaves) and this runs in microseconds.
 */
function minimax(board: Cell[], player: Player, ai: Player): { score: number; move: number } {
  const { winner } = checkWinner(board);
  if (winner === ai) return { score: 1, move: -1 };
  if (winner && winner !== ai) return { score: -1, move: -1 };
  if (isFull(board)) return { score: 0, move: -1 };

  const isAi = player === ai;
  let bestScore = isAi ? -Infinity : Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = player;
    const { score } = minimax(board, player === "X" ? "O" : "X", ai);
    board[i] = null;
    if (isAi ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return { score: bestScore, move: bestMove };
}

interface TicTacToeScreenProps {
  onExit: () => void;
}

export function TicTacToeScreen({ onExit }: TicTacToeScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [board, setBoard] = useState<Cell[]>(() => Array(9).fill(null) as Cell[]);
  const [turn, setTurn] = useState<Player>("X");
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 });
  const [first, setFirst] = useState<Player>("X");
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);

  const aiTimeoutRef = useRef<number | null>(null);

  const { winner, line } = useMemo(() => checkWinner(board), [board]);
  const full = useMemo(() => isFull(board), [board]);

  const status: GameState = useMemo(() => {
    if (winner === "X") return "won";
    if (winner === "O") return "lost";
    if (full) return "draw";
    return "playing";
  }, [winner, full]);

  /* ── Reset / new round ──────────────────────────────────────────────── */

  const startRound = useCallback(
    (firstPlayer: Player) => {
      if (aiTimeoutRef.current != null) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      setBoard(Array(9).fill(null) as Cell[]);
      setTurn(firstPlayer);
      setFirst(firstPlayer);
      setLastXp(null);
      lastStatusRef.current = "playing";
    },
    [],
  );

  const handleReset = useCallback(() => {
    // Alternate who starts so the player gets a fair shake.
    const next: Player = first === "X" ? "O" : "X";
    startRound(next);
  }, [first, startRound]);

  /* ── Player click ───────────────────────────────────────────────────── */

  const placeAt = useCallback(
    (idx: number) => {
      if (status !== "playing" || turn !== "X" || board[idx] !== null) return;
      const next = board.slice();
      next[idx] = "X";
      setBoard(next);
      setTurn("O");
      play("click");
      haptic("tap");
    },
    [board, status, turn, play, haptic],
  );

  /* ── AI move ────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (status !== "playing" || turn !== "O") return;
    // Small delay so the AI doesn't feel instant — also lets the player
    // see their own move register first.
    aiTimeoutRef.current = window.setTimeout(() => {
      setBoard((prev) => {
        if (prev.some((c, i) => c !== board[i])) return prev;
        const working = prev.slice();
        const { move } = minimax(working, "O", "O");
        if (move < 0) return prev;
        working[move] = "O";
        return working;
      });
      setTurn("X");
      play("click");
      aiTimeoutRef.current = null;
    }, 380);
    return () => {
      if (aiTimeoutRef.current != null) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, [board, status, turn, play]);

  /* ── End-of-round bookkeeping ───────────────────────────────────────── */

  const lastStatusRef = useRef<GameState>("playing");
  useEffect(() => {
    if (status === lastStatusRef.current) return;
    lastStatusRef.current = status;
    if (status === "won") {
      setScore((s) => ({ ...s, wins: s.wins + 1 }));
      const granted = awardXp(XP_WIN);
      if (granted > 0) setLastXp(granted);
      recordMinigame("tictactoe", { won: true, score: 1 });
      setConfettiTick((c) => c + 1);
      play("complete");
      haptic("success");
    } else if (status === "lost") {
      setScore((s) => ({ ...s, losses: s.losses + 1 }));
      setLastXp(null);
      recordMinigame("tictactoe", { won: false });
      play("fail");
      haptic("error");
    } else if (status === "draw") {
      setScore((s) => ({ ...s, draws: s.draws + 1 }));
      const granted = awardXp(XP_DRAW);
      if (granted > 0) setLastXp(granted);
      recordMinigame("tictactoe", { won: false });
      play("click");
      haptic("warning");
    }
  }, [status, play, haptic, awardXp, recordMinigame]);

  /* ── Cleanup on unmount ─────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current != null) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, []);

  /* ── Render ─────────────────────────────────────────────────────────── */

  const statusText =
    status === "won"
      ? t("tictactoe.you_win")
      : status === "lost"
        ? t("tictactoe.you_lose")
        : status === "draw"
          ? t("tictactoe.draw")
          : turn === "X"
            ? t("tictactoe.your_turn")
            : t("tictactoe.ai_turn");

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="btn-ghost h-10 px-3 rounded-2xl"
          aria-label={t("common.back")}
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("tictactoe.title")}
          </h1>
          <p className="text-xs text-white/55 mt-0.5">
            {t("tictactoe.subtitle")}
          </p>
        </div>
      </header>

      {/* Scoreboard */}
      <section className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("tictactoe.you")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-success">
            {score.wins}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("tictactoe.draw_short")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-white/85">
            {score.draws}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("tictactoe.ai")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-danger">
            {score.losses}
          </div>
        </div>
      </section>

      {/* Status */}
      <div className="glass rounded-2xl px-4 py-3 text-center">
        <div className="text-sm font-semibold">{statusText}</div>
        {lastXp != null && status !== "playing" && (
          <div className="mt-1 text-xs text-accent-neon font-semibold animate-fade-in">
            +{lastXp} XP
          </div>
        )}
      </div>

      {/* Board */}
      <section className="glass rounded-3xl p-3 sm:p-4 shadow-soft animate-rise">
        <div
          className="grid w-full max-w-[min(80vmin,420px)] mx-auto"
          style={{
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "0.5rem",
          }}
        >
          {board.map((cell, i) => {
            const inLine = line?.includes(i) ?? false;
            const claimable = status === "playing" && turn === "X" && cell === null;
            const isX = cell === "X";
            const isO = cell === "O";
            return (
              <button
                key={i}
                type="button"
                onClick={() => placeAt(i)}
                disabled={!claimable}
                aria-label={`Cell ${i + 1}`}
                className={[
                  "aspect-square w-full rounded-2xl glass border border-white/10",
                  "flex items-center justify-center text-5xl sm:text-6xl font-bold",
                  "transition-[transform,background-color,box-shadow] duration-200 ease-out",
                  "active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-accent-glow",
                  claimable ? "hover:bg-white/[0.06] hover:-translate-y-0.5" : "",
                  inLine
                    ? "shadow-[0_0_30px_rgba(34,211,238,0.45)] border-accent-neon/60"
                    : "",
                  isX ? "text-accent-glow" : "",
                  isO ? "text-rose-300" : "",
                ].join(" ")}
              >
                {cell ?? ""}
              </button>
            );
          })}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="btn-primary flex-1 min-w-[140px]"
        >
          {status === "playing" ? t("tictactoe.new_round") : t("tictactoe.play_again")}
        </button>
        <button
          type="button"
          onClick={() => {
            setScore({ wins: 0, losses: 0, draws: 0 });
            startRound("X");
          }}
          className="btn-ghost"
        >
          {t("tictactoe.reset_scores")}
        </button>
      </div>

      <p className="text-xs text-white/45 text-center">
        {t("tictactoe.tip" as TranslationKey)}
      </p>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
