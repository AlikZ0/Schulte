import { useCallback, useEffect, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

const ROWS = 6;
const COLS = 7;
const XP_WIN = 60;
const XP_DRAW = 8;

type Cell = 0 | 1 | 2; // 0 empty, 1 player, 2 ai
type Board = Cell[];

function emptyBoard(): Board {
  return new Array(ROWS * COLS).fill(0);
}

function dropPiece(board: Board, col: number, who: 1 | 2): { board: Board; row: number } | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    const i = r * COLS + col;
    if (board[i] === 0) {
      const next = board.slice();
      next[i] = who;
      return { board: next, row: r };
    }
  }
  return null;
}

const DIRS: Array<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function checkWin(b: Board, who: Cell): Array<number> | null {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (b[r * COLS + c] !== who) continue;
      for (const [dr, dc] of DIRS) {
        const indices: number[] = [];
        let ok = true;
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) {
            ok = false;
            break;
          }
          if (b[rr * COLS + cc] !== who) {
            ok = false;
            break;
          }
          indices.push(rr * COLS + cc);
        }
        if (ok) return indices;
      }
    }
  return null;
}

function isFull(b: Board): boolean {
  return b.every((v) => v !== 0);
}

/**
 * Heuristic AI: 1) win if possible, 2) block player win, 3) prefer center.
 */
function aiMove(b: Board): number {
  const tryFor = (who: 1 | 2): number => {
    for (let c = 0; c < COLS; c++) {
      const r = dropPiece(b, c, who);
      if (!r) continue;
      if (checkWin(r.board, who)) return c;
    }
    return -1;
  };
  const winNow = tryFor(2);
  if (winNow >= 0) return winNow;
  const block = tryFor(1);
  if (block >= 0) return block;
  // Prefer center columns, but choose only valid ones.
  const order = [3, 4, 2, 5, 1, 6, 0];
  for (const c of order) {
    if (dropPiece(b, c, 2)) return c;
  }
  return 0;
}

interface Connect4ScreenProps {
  onExit: () => void;
}

export function Connect4Screen({ onExit }: Connect4ScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [turn, setTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<0 | 1 | 2 | 3>(0); // 3 = draw
  const [winLine, setWinLine] = useState<Set<number>>(new Set());
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 });
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const aiTimerRef = useRef<number | null>(null);
  const settledRef = useRef(false);

  const restart = useCallback(() => {
    if (aiTimerRef.current != null) window.clearTimeout(aiTimerRef.current);
    setBoard(emptyBoard());
    setTurn(1);
    setWinner(0);
    setWinLine(new Set());
    setLastXp(null);
    settledRef.current = false;
  }, []);

  const settleAndAward = useCallback(
    (b: Board, w: 0 | 1 | 2 | 3) => {
      setWinner(w);
      if (settledRef.current) return;
      settledRef.current = true;
      if (w === 1) {
        setScore((s) => ({ ...s, wins: s.wins + 1 }));
        const granted = awardXp(XP_WIN);
        if (granted > 0) setLastXp(granted);
        recordMinigame("connect4", { won: true, score: 1 });
        setConfettiTick((c) => c + 1);
        play("complete");
        haptic("success");
      } else if (w === 2) {
        setScore((s) => ({ ...s, losses: s.losses + 1 }));
        recordMinigame("connect4", { won: false });
        play("fail");
        haptic("error");
      } else {
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
        const granted = awardXp(XP_DRAW);
        if (granted > 0) setLastXp(granted);
        recordMinigame("connect4", { won: false });
        play("click");
        haptic("warning");
      }
      void b;
    },
    [awardXp, play, haptic, recordMinigame],
  );

  const onColumn = (c: number) => {
    if (winner !== 0 || turn !== 1) return;
    const r = dropPiece(board, c, 1);
    if (!r) return;
    setBoard(r.board);
    play("click");
    haptic("tap");
    const win = checkWin(r.board, 1);
    if (win) {
      setWinLine(new Set(win));
      settleAndAward(r.board, 1);
      return;
    }
    if (isFull(r.board)) {
      settleAndAward(r.board, 3);
      return;
    }
    setTurn(2);
  };

  /* AI's turn. */
  useEffect(() => {
    if (winner !== 0 || turn !== 2) return;
    aiTimerRef.current = window.setTimeout(() => {
      const c = aiMove(board);
      const r = dropPiece(board, c, 2);
      if (!r) return;
      setBoard(r.board);
      play("click");
      const win = checkWin(r.board, 2);
      if (win) {
        setWinLine(new Set(win));
        settleAndAward(r.board, 2);
        return;
      }
      if (isFull(r.board)) {
        settleAndAward(r.board, 3);
        return;
      }
      setTurn(1);
    }, 480);
    return () => {
      if (aiTimerRef.current != null) window.clearTimeout(aiTimerRef.current);
    };
  }, [turn, winner, board, play, settleAndAward]);

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("connect4.title")} subtitle={t("connect4.subtitle")} onExit={onExit} />

      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("tictactoe.you")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-success">{score.wins}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("tictactoe.draw_short")}
          </div>
          <div className="text-2xl font-bold tabular-nums">{score.draws}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("tictactoe.ai")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-danger">{score.losses}</div>
        </div>
      </div>

      <div
        className={[
          "rounded-2xl px-4 py-3 text-center border transition-colors",
          winner === 1
            ? "border-accent-success/40 bg-accent-success/10 text-accent-success"
            : winner === 2
              ? "border-accent-danger/40 bg-accent-danger/10 text-rose-300"
              : winner === 3
                ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                : "glass",
        ].join(" ")}
      >
        <div className="text-sm font-semibold">
          {winner === 1
            ? t("tictactoe.you_win")
            : winner === 2
              ? t("tictactoe.you_lose")
              : winner === 3
                ? t("tictactoe.draw")
                : turn === 1
                  ? t("tictactoe.your_turn")
                  : t("tictactoe.ai_turn")}
        </div>
        {lastXp != null && (
          <div className="mt-1 text-xs text-accent-neon font-semibold animate-fade-in">
            +{lastXp} XP
          </div>
        )}
      </div>

      <section className="glass rounded-3xl p-3 sm:p-4 shadow-soft mx-auto" style={{ touchAction: "manipulation" }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            gap: "0.3rem",
            maxWidth: "min(90vmin, 480px)",
          }}
        >
          {board.map((v, i) => {
            const c = i % COLS;
            const isWin = winLine.has(i);
            return (
              <button
                key={i}
                onClick={() => onColumn(c)}
                disabled={winner !== 0 || turn !== 1}
                className={[
                  "aspect-square rounded-full flex items-center justify-center",
                  "transition-all duration-200 active:scale-95",
                  v === 0
                    ? "bg-white/[0.05] hover:bg-white/[0.10]"
                    : v === 1
                      ? "bg-gradient-to-br from-accent to-accent-glow shadow-[0_0_18px_rgba(124,92,255,0.45)]"
                      : "bg-gradient-to-br from-rose-500 to-amber-400 shadow-[0_0_18px_rgba(244,63,94,0.45)]",
                  isWin ? "ring-2 ring-accent-neon scale-105" : "",
                ].join(" ")}
              />
            );
          })}
        </div>
      </section>

      <button onClick={restart} className="btn-primary">
        {t("common.restart")}
      </button>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
