import { useCallback, useEffect, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { MinigameHeader } from "../components/MinigameHeader";
import { Confetti } from "../components/Confetti";

const SYMBOLS = ["★", "●", "◆", "▲", "✿", "♣", "☀", "☾"]; // 8 pairs = 16 cards
const XP_WIN_BASE = 60;
const XP_PENALTY_PER_TRY = 1;

interface CardState {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

function buildDeck(): CardState[] {
  const deck = [...SYMBOLS, ...SYMBOLS]
    .map((s, i) => ({ id: i, symbol: s, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
    .map((c, i) => ({ ...c, id: i }));
  return deck;
}

interface MemoryScreenProps {
  onExit: () => void;
}

export function MemoryScreen({ onExit }: MemoryScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const [deck, setDeck] = useState<CardState[]>(() => buildDeck());
  const [tries, setTries] = useState(0);
  const [matched, setMatched] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const flipTimerRef = useRef<number | null>(null);
  const wonRef = useRef(false);

  const restart = useCallback(() => {
    if (flipTimerRef.current != null) window.clearTimeout(flipTimerRef.current);
    setDeck(buildDeck());
    setTries(0);
    setMatched(0);
    setBusy(false);
    setLastXp(null);
    wonRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current != null) window.clearTimeout(flipTimerRef.current);
    };
  }, []);

  /* End-game detection. */
  useEffect(() => {
    if (matched === SYMBOLS.length && !wonRef.current) {
      wonRef.current = true;
      const granted = awardXp(Math.max(10, XP_WIN_BASE - tries * XP_PENALTY_PER_TRY));
      if (granted > 0) setLastXp(granted);
      // Higher score = fewer tries needed.
      recordMinigame("memory", { won: true, score: Math.max(1, 100 - tries) });
      setConfettiTick((c) => c + 1);
      play("complete");
      haptic("success");
    }
  }, [matched, tries, awardXp, play, haptic, recordMinigame]);

  const onTap = useCallback(
    (idx: number) => {
      if (busy) return;
      const card = deck[idx];
      if (card.flipped || card.matched) return;
      const open = deck.filter((c) => c.flipped && !c.matched);
      if (open.length >= 2) return;

      const next = deck.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
      setDeck(next);
      play("click");
      haptic("tap");

      const newOpen = next.filter((c) => c.flipped && !c.matched);
      if (newOpen.length === 2) {
        setTries((tr) => tr + 1);
        setBusy(true);
        const [a, b] = newOpen;
        if (a.symbol === b.symbol) {
          flipTimerRef.current = window.setTimeout(() => {
            setDeck((d) =>
              d.map((c) =>
                c.id === a.id || c.id === b.id ? { ...c, matched: true } : c,
              ),
            );
            setMatched((m) => m + 1);
            setBusy(false);
            play("correct");
          }, 320);
        } else {
          flipTimerRef.current = window.setTimeout(() => {
            setDeck((d) =>
              d.map((c) =>
                (c.id === a.id || c.id === b.id) && !c.matched
                  ? { ...c, flipped: false }
                  : c,
              ),
            );
            setBusy(false);
            play("wrong");
          }, 800);
        }
      }
    },
    [deck, busy, play, haptic],
  );

  const won = matched === SYMBOLS.length;

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <MinigameHeader title={t("memory.title")} subtitle={t("memory.subtitle")} onExit={onExit} />

      <section className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("memory.tries")}
          </div>
          <div className="text-2xl font-bold tabular-nums">{tries}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("memory.matched")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-success">
            {matched}/{SYMBOLS.length}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("common.score")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-neon">
            {Math.max(0, SYMBOLS.length * 10 - tries * 5)}
          </div>
        </div>
      </section>

      {won && (
        <div className="rounded-2xl px-4 py-3 text-center border border-accent-success/40 bg-accent-success/10 text-accent-success">
          <div className="text-sm font-semibold">{t("memory.win")}</div>
          {lastXp != null && (
            <div className="mt-1 text-xs text-accent-neon font-semibold animate-fade-in">
              +{lastXp} XP
            </div>
          )}
        </div>
      )}

      <section className="glass rounded-3xl p-3 sm:p-4 shadow-soft">
        <div
          className="grid w-full max-w-[min(82vmin,440px)] mx-auto"
          style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "0.5rem" }}
        >
          {deck.map((c, i) => {
            const open = c.flipped || c.matched;
            return (
              <button
                key={c.id}
                onClick={() => onTap(i)}
                disabled={open || busy}
                className={[
                  "aspect-square rounded-xl border border-white/15 flex items-center justify-center",
                  "text-3xl sm:text-4xl font-bold transition-all duration-300 active:scale-95",
                  open
                    ? c.matched
                      ? "bg-gradient-to-br from-accent-success/40 to-accent-success/15 text-accent-success shadow-[0_0_24px_rgba(34,197,94,0.25)]"
                      : "bg-white/[0.10] text-white"
                    : "bg-gradient-to-br from-accent/30 to-accent-glow/30 text-white/0 hover:from-accent/40",
                ].join(" ")}
              >
                {open ? c.symbol : "?"}
              </button>
            );
          })}
        </div>
      </section>

      <button onClick={restart} className="btn-primary">
        {won ? t("common.restart") : t("memory.shuffle")}
      </button>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
