import { useCallback, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

const ROWS = 8;
const COLS = 8;
const MINES = 10;
const XP_WIN = 70;

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  /** Number of adjacent mines (0..8). */
  count: number;
}

function buildBoard(): Cell[] {
  const cells: Cell[] = Array.from({ length: ROWS * COLS }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    count: 0,
  }));
  // Place mines.
  const indices = [...Array(ROWS * COLS).keys()].sort(() => Math.random() - 0.5);
  for (let i = 0; i < MINES; i++) cells[indices[i]].mine = true;
  // Compute counts.
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (cells[r * COLS + c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
          if (cells[rr * COLS + cc].mine) n++;
        }
      cells[r * COLS + c].count = n;
    }
  return cells;
}

function flood(cells: Cell[], idx: number): Cell[] {
  const next = cells.map((c) => ({ ...c }));
  const stack = [idx];
  while (stack.length) {
    const i = stack.pop()!;
    const c = next[i];
    if (c.revealed || c.flagged) continue;
    c.revealed = true;
    if (c.count === 0 && !c.mine) {
      const r = Math.floor(i / COLS);
      const cc = i % COLS;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const ccc = cc + dc;
          if (rr < 0 || rr >= ROWS || ccc < 0 || ccc >= COLS) continue;
          stack.push(rr * COLS + ccc);
        }
    }
  }
  return next;
}

const COUNT_COLORS = [
  "",
  "text-sky-300",
  "text-emerald-300",
  "text-amber-300",
  "text-rose-300",
  "text-fuchsia-300",
  "text-cyan-200",
  "text-white",
  "text-white/70",
];

interface MinesScreenProps {
  onExit: () => void;
}

export function MinesScreen({ onExit }: MinesScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [cells, setCells] = useState<Cell[]>(() => buildBoard());
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const wonRef = useRef(false);
  const recordedRef = useRef(false);

  const restart = useCallback(() => {
    setCells(buildBoard());
    setOver(false);
    setWon(false);
    setLastXp(null);
    wonRef.current = false;
    recordedRef.current = false;
  }, []);

  const onCell = (i: number) => {
    if (over) return;
    setCells((cur) => {
      const c = cur[i];
      if (c.revealed) return cur;
      if (flagMode) {
        const next = cur.slice();
        next[i] = { ...c, flagged: !c.flagged };
        return next;
      }
      if (c.flagged) return cur;
      if (c.mine) {
        const next = cur.map((x) => (x.mine ? { ...x, revealed: true } : x));
        setOver(true);
        if (!recordedRef.current) {
          recordedRef.current = true;
          recordMinigame("mines", { won: false });
        }
        play("fail");
        haptic("error");
        return next;
      }
      const next = flood(cur, i);
      const allRevealed = next.every((x) => x.mine || x.revealed);
      if (allRevealed && !wonRef.current) {
        wonRef.current = true;
        recordedRef.current = true;
        setWon(true);
        setOver(true);
        const granted = awardXp(XP_WIN);
        if (granted > 0) setLastXp(granted);
        recordMinigame("mines", { won: true, score: 1 });
        setConfettiTick((cc) => cc + 1);
        play("complete");
        haptic("success");
      } else {
        play("click");
        haptic("tap");
      }
      return next;
    });
  };

  const flagsLeft = MINES - cells.filter((c) => c.flagged).length;

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("mines.title")} subtitle={t("mines.subtitle")} onExit={onExit} />

      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("mines.flags")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-neon">{flagsLeft}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("mines.mines")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-danger">{MINES}</div>
        </div>
        <button
          onClick={() => setFlagMode((m) => !m)}
          className={[
            "rounded-2xl p-3 transition-colors",
            flagMode
              ? "bg-gradient-to-br from-accent to-accent-glow text-white shadow-glow"
              : "glass text-white/85",
          ].join(" ")}
        >
          <div className="text-[10px] uppercase tracking-widest opacity-60">
            {t("mines.mode")}
          </div>
          <div className="text-lg font-bold">{flagMode ? "🚩" : "👆"}</div>
        </button>
      </div>

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
            {won ? t("mines.win") : t("mines.boom")}
          </div>
          {lastXp != null && (
            <div className="mt-1 text-xs text-accent-neon font-semibold">+{lastXp} XP</div>
          )}
        </div>
      )}

      <section className="glass rounded-3xl p-3 shadow-soft mx-auto" style={{ touchAction: "manipulation" }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            gap: "2px",
          }}
        >
          {cells.map((c, i) => (
            <button
              key={i}
              onClick={() => onCell(i)}
              disabled={over && !won}
              className={[
                "aspect-square w-9 sm:w-10 rounded-md text-sm font-bold tabular-nums",
                c.revealed
                  ? c.mine
                    ? "bg-accent-danger/40 text-white"
                    : "bg-white/[0.05] " + (c.count > 0 ? COUNT_COLORS[c.count] : "")
                  : c.flagged
                    ? "bg-amber-400/30 text-amber-200"
                    : "bg-white/[0.10] hover:bg-white/[0.16] active:scale-95",
              ].join(" ")}
            >
              {c.revealed
                ? c.mine
                  ? "✸"
                  : c.count > 0
                    ? c.count
                    : ""
                : c.flagged
                  ? "🚩"
                  : ""}
            </button>
          ))}
        </div>
      </section>

      <button onClick={restart} className="btn-primary">
        {t("common.restart")}
      </button>
      <p className="text-xs text-white/45 text-center">{t("mines.tip")}</p>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
