import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { useSound } from "../hooks/useSound";
import { useHaptics } from "../hooks/useHaptics";
import { Confetti } from "../components/Confetti";
import type { TranslationKey } from "../i18n";

/* XP awarded for each blackjack outcome. Naturals pay extra like real
   tables. Pushes give a small consolation reward; losses give nothing. */
const XP_WIN = 20;
const XP_BLACKJACK = 45;
const XP_PUSH = 3;

/* ──────────────────────────────────────────────────────────────────────────
   Card / deck primitives
   ──────────────────────────────────────────────────────────────────────── */

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

interface Card {
  rank: Rank;
  suit: Suit;
  /** Stable id used as React key — survives re-renders cleanly. */
  id: string;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
];

function buildShoe(decks = 4): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) {
      for (const r of RANKS) {
        shoe.push({ rank: r, suit: s, id: `${d}-${s}-${r}` });
      }
    }
  }
  // Fisher–Yates shuffle.
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function cardValue(card: Card): number {
  if (card.rank === "A") return 11;
  if (card.rank === "K" || card.rank === "Q" || card.rank === "J") return 10;
  return parseInt(card.rank, 10);
}

/**
 * Highest non-busting hand total. Aces count as 11 unless that would bust,
 * in which case as many as needed are demoted to 1.
 */
function handTotal(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === "A") aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards) === 21;
}

/* ──────────────────────────────────────────────────────────────────────────
   Card visual
   ──────────────────────────────────────────────────────────────────────── */

interface PlayingCardProps {
  card?: Card;
  hidden?: boolean;
  /**
   * Animation delay in ms — used to stagger the deal-in so multiple cards
   * fly into the table in sequence rather than all at once.
   */
  delay?: number;
}

/**
 * Standard pip layouts (1-indexed coordinates on a 3-column grid) used by
 * real playing cards. Each entry lists which of 7 vertical "slots"
 * (row 1..7) get a pip, in column 1 / 2 / 3. We render with absolute
 * positioning so the layout is clean at any size.
 */
const PIP_LAYOUTS: Record<string, Array<[number, number]>> = {
  // [col (1..3), row (1..7)]
  "2":  [[2, 1], [2, 7]],
  "3":  [[2, 1], [2, 4], [2, 7]],
  "4":  [[1, 1], [3, 1], [1, 7], [3, 7]],
  "5":  [[1, 1], [3, 1], [2, 4], [1, 7], [3, 7]],
  "6":  [[1, 1], [3, 1], [1, 4], [3, 4], [1, 7], [3, 7]],
  "7":  [[1, 1], [3, 1], [2, 2], [1, 4], [3, 4], [1, 7], [3, 7]],
  "8":  [[1, 1], [3, 1], [2, 2], [1, 4], [3, 4], [2, 6], [1, 7], [3, 7]],
  "9":  [[1, 1], [3, 1], [1, 3], [3, 3], [2, 4], [1, 5], [3, 5], [1, 7], [3, 7]],
  "10": [[1, 1], [3, 1], [1, 3], [3, 3], [2, 2], [2, 6], [1, 5], [3, 5], [1, 7], [3, 7]],
};

function PlayingCard({ card, hidden = false, delay = 0 }: PlayingCardProps) {
  if (hidden || !card) {
    return (
      <div
        className="aspect-[2.5/3.5] w-[68px] sm:w-[80px] rounded-xl border border-white/20
                   bg-gradient-to-br from-accent via-accent/70 to-accent-glow
                   shadow-soft p-1.5 animate-card-deal"
        style={{ animationDelay: `${delay}ms` }}
        aria-hidden
      >
        <div
          className="h-full w-full rounded-lg border border-white/30 grid place-items-center
                     bg-[linear-gradient(45deg,rgba(255,255,255,0.08)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.08)_75%,transparent_75%,transparent)]
                     bg-[length:8px_8px]"
        >
          <span className="text-2xl text-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            ✦
          </span>
        </div>
      </div>
    );
  }

  const isRed = card.suit === "♥" || card.suit === "♦";
  const colorClass = isRed ? "text-rose-600" : "text-zinc-900";

  /* The face for the rank. */
  let face: JSX.Element;
  const layout = PIP_LAYOUTS[card.rank];
  if (layout) {
    face = (
      <div className="absolute inset-2 grid grid-cols-3 grid-rows-7">
        {layout.map(([col, row], i) => (
          <span
            key={i}
            className={[
              "flex items-center justify-center text-[14px] sm:text-base leading-none",
              row > 4 ? "rotate-180" : "",
            ].join(" ")}
            style={{ gridColumn: col, gridRow: row }}
          >
            {card.suit}
          </span>
        ))}
      </div>
    );
  } else if (card.rank === "A") {
    face = (
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-3xl sm:text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]">
          {card.suit}
        </span>
      </div>
    );
  } else {
    /* J / Q / K — stylized typographic face. */
    const iconRing =
      card.rank === "K" ? "♛" : card.rank === "Q" ? "✿" : "✦";
    face = (
      <div className="absolute inset-2 rounded-md border border-current/30 grid place-items-center">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[18px] sm:text-xl">{iconRing}</span>
          <span className="text-2xl sm:text-3xl font-extrabold leading-none">
            {card.rank}
          </span>
          <span className="text-[14px] sm:text-base">{card.suit}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "relative aspect-[2.5/3.5] w-[68px] sm:w-[80px] rounded-xl border border-white/30",
        "shadow-[0_4px_18px_rgba(0,0,0,0.35)] animate-card-deal",
        // Subtle paper texture using gradients (no images).
        "bg-[radial-gradient(circle_at_30%_20%,#fff_0%,#f5f5f7_60%,#e5e5ea_100%)]",
        colorClass,
      ].join(" ")}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top-left corner index */}
      <div className="absolute left-1.5 top-1 leading-none flex flex-col items-center">
        <span className="font-bold text-xs sm:text-sm">{card.rank}</span>
        <span className="text-[10px] sm:text-xs">{card.suit}</span>
      </div>
      {/* Bottom-right corner (rotated) */}
      <div className="absolute right-1.5 bottom-1 leading-none flex flex-col items-center rotate-180">
        <span className="font-bold text-xs sm:text-sm">{card.rank}</span>
        <span className="text-[10px] sm:text-xs">{card.suit}</span>
      </div>
      {face}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Screen
   ──────────────────────────────────────────────────────────────────────── */

type Phase = "player" | "dealer" | "settled";
type Outcome = "win" | "lose" | "push" | "blackjack" | null;

interface BlackjackScreenProps {
  onExit: () => void;
}

/** Two cards count as splittable when their basic value matches (10/J/Q/K). */
function canSplit(hand: Card[]): boolean {
  if (hand.length !== 2) return false;
  return cardValue(hand[0]) === cardValue(hand[1]);
}

export function BlackjackScreen({ onExit }: BlackjackScreenProps) {
  const { settings, t } = useSettings();
  const { awardXp, recordMinigame } = useProgress();
  const { play } = useSound(settings.sound);
  const haptic = useHaptics(settings.haptics);

  const shoeRef = useRef<Card[]>(buildShoe());
  /** All player hands — usually 1, becomes 2 after a split. */
  const [hands, setHands] = useState<Card[][]>([]);
  /** Index of the hand the player is currently acting on. */
  const [activeHand, setActiveHand] = useState(0);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("settled");
  /** Per-hand outcomes once the round is settled. */
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [score, setScore] = useState({ wins: 0, losses: 0, pushes: 0 });
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);

  const dealerTimeoutRef = useRef<number | null>(null);

  const draw = useCallback((): Card => {
    if (shoeRef.current.length < 15) shoeRef.current = buildShoe();
    return shoeRef.current.pop() as Card;
  }, []);

  /**
   * Settle every player hand against the final dealer hand and tally XP +
   * score totals across all hands.
   */
  const settleAll = useCallback(
    (allHands: Card[][], d: Card[]) => {
      const dt = handTotal(d);
      const dBJ = isBlackjack(d);
      const results: Outcome[] = [];
      let dWins = 0;
      let dLosses = 0;
      let dPushes = 0;
      let xpDelta = 0;

      for (const p of allHands) {
        const pt = handTotal(p);
        // Natural blackjack only counts when there's a single hand (i.e. no
        // split) — split 21s pay as a regular win like a real casino.
        const pBJ = allHands.length === 1 && isBlackjack(p);
        let res: Outcome;
        if (pt > 21) res = "lose";
        else if (dt > 21) res = "win";
        else if (pBJ && !dBJ) res = "blackjack";
        else if (!pBJ && dBJ) res = "lose";
        else if (pt > dt) res = "win";
        else if (pt < dt) res = "lose";
        else res = "push";

        results.push(res);
        if (res === "blackjack") {
          dWins += 1;
          xpDelta += XP_BLACKJACK;
        } else if (res === "win") {
          dWins += 1;
          xpDelta += XP_WIN;
        } else if (res === "lose") {
          dLosses += 1;
        } else {
          dPushes += 1;
          xpDelta += XP_PUSH;
        }
      }

      setOutcomes(results);
      setPhase("settled");

      setScore((s) => ({
        wins: s.wins + dWins,
        losses: s.losses + dLosses,
        pushes: s.pushes + dPushes,
      }));

      const granted = xpDelta > 0 ? awardXp(xpDelta) : 0;
      setLastXp(granted > 0 ? granted : null);

      const won = dWins > 0 && dLosses === 0;
      recordMinigame("blackjack", { won, score: dWins });

      if (won) {
        setConfettiTick((c) => c + 1);
        play("complete");
        haptic("success");
      } else if (dLosses > 0 && dWins === 0) {
        play("fail");
        haptic("error");
      } else {
        play("click");
        haptic("warning");
      }
    },
    [play, haptic, awardXp, recordMinigame],
  );

  const startRound = useCallback(() => {
    if (dealerTimeoutRef.current != null) {
      window.clearTimeout(dealerTimeoutRef.current);
      dealerTimeoutRef.current = null;
    }
    const p = [draw(), draw()];
    const d = [draw(), draw()];
    setHands([p]);
    setActiveHand(0);
    setDealer(d);
    setOutcomes([]);
    setLastXp(null);

    if (isBlackjack(p) || isBlackjack(d)) {
      // Immediate showdown — natural blackjack on either side ends the round.
      settleAll([p], d);
      return;
    }
    setPhase("player");
    play("click");
  }, [draw, play, settleAll]);

  /** Move to next un-played hand, or trigger dealer phase if no more remain. */
  const advanceHand = useCallback((after: Card[][]) => {
    setActiveHand((cur) => {
      const next = cur + 1;
      if (next < after.length) return next;
      // All hands are done — dealer plays.
      setPhase("dealer");
      return cur;
    });
  }, []);

  const hit = useCallback(() => {
    if (phase !== "player") return;
    setHands((cur) => {
      const next = cur.map((h, i) => (i === activeHand ? [...h, draw()] : h));
      const t = handTotal(next[activeHand]);
      play("click");
      haptic("tap");
      if (t >= 21) {
        // 21 / bust — auto-advance to next hand.
        advanceHand(next);
      }
      return next;
    });
  }, [phase, activeHand, draw, play, haptic, advanceHand]);

  const stand = useCallback(() => {
    if (phase !== "player") return;
    play("click");
    haptic("tap");
    advanceHand(hands);
  }, [phase, hands, play, haptic, advanceHand]);

  const split = useCallback(() => {
    if (phase !== "player") return;
    if (hands.length !== 1) return; // Only support one split per round.
    const h = hands[activeHand];
    if (!canSplit(h)) return;
    const handA = [h[0], draw()];
    const handB = [h[1], draw()];
    setHands([handA, handB]);
    setActiveHand(0);
    play("click");
    haptic("tap");
  }, [phase, hands, activeHand, draw, play, haptic]);

  /* Dealer auto-play. Runs once when phase flips to "dealer". */
  useEffect(() => {
    if (phase !== "dealer") return;
    let cancelled = false;

    // If every player hand busted, no need to draw — settle straight away.
    const anyAlive = hands.some((h) => handTotal(h) <= 21);
    if (!anyAlive) {
      settleAll(hands, dealer);
      return;
    }

    const step = (currentDealer: Card[]) => {
      if (cancelled) return;
      const total = handTotal(currentDealer);
      if (total < 17) {
        const next = [...currentDealer, draw()];
        setDealer(next);
        play("click");
        dealerTimeoutRef.current = window.setTimeout(() => step(next), 600);
      } else {
        settleAll(hands, currentDealer);
      }
    };

    dealerTimeoutRef.current = window.setTimeout(() => step(dealer), 600);

    return () => {
      cancelled = true;
      if (dealerTimeoutRef.current != null) {
        window.clearTimeout(dealerTimeoutRef.current);
        dealerTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Auto-deal the very first round on mount. */
  useEffect(() => {
    startRound();
    return () => {
      if (dealerTimeoutRef.current != null) {
        window.clearTimeout(dealerTimeoutRef.current);
        dealerTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dealerVisibleTotal = useMemo(
    () => (phase === "player" ? cardValue(dealer[0] ?? ({} as Card)) : handTotal(dealer)),
    [dealer, phase],
  );

  const splittable =
    phase === "player" &&
    hands.length === 1 &&
    canSplit(hands[activeHand] ?? []);

  /** Aggregate status — when split, prefers the most-impactful outcome. */
  const statusText: string = useMemo(() => {
    if (phase === "player") {
      if (hands.length > 1) {
        return `${t("blackjack.hand")} ${activeHand + 1}/${hands.length} — ${t(
          "blackjack.your_turn",
        )}`;
      }
      return t("blackjack.your_turn");
    }
    if (phase === "dealer") return t("blackjack.dealer_turn");
    // Settled — pick a representative outcome.
    if (outcomes.length === 0) return "";
    if (outcomes.length === 1) {
      const o = outcomes[0];
      if (o === "blackjack") return t("blackjack.blackjack");
      if (o === "win") return t("blackjack.you_win");
      if (o === "lose") return t("blackjack.you_lose");
      return t("blackjack.push");
    }
    const wins = outcomes.filter((o) => o === "win" || o === "blackjack").length;
    const losses = outcomes.filter((o) => o === "lose").length;
    if (wins > 0 && losses === 0) return t("blackjack.you_win");
    if (losses > 0 && wins === 0) return t("blackjack.you_lose");
    return t("blackjack.split_mixed");
  }, [phase, hands.length, activeHand, outcomes, t]);

  /** A single representative outcome for status colouring. */
  const aggregateOutcome: Outcome = useMemo(() => {
    if (outcomes.length === 0) return null;
    const wins = outcomes.filter((o) => o === "win" || o === "blackjack").length;
    const losses = outcomes.filter((o) => o === "lose").length;
    if (outcomes.some((o) => o === "blackjack")) return "blackjack";
    if (wins > 0 && losses === 0) return "win";
    if (losses > 0 && wins === 0) return "lose";
    return "push";
  }, [outcomes]);

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
            {t("blackjack.title")}
          </h1>
          <p className="text-xs text-white/55 mt-0.5">
            {t("blackjack.subtitle")}
          </p>
        </div>
      </header>

      {/* Scoreboard */}
      <section className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("blackjack.you")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-success">
            {score.wins}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("blackjack.push_short")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-white/85">
            {score.pushes}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {t("blackjack.dealer")}
          </div>
          <div className="text-2xl font-bold tabular-nums text-accent-danger">
            {score.losses}
          </div>
        </div>
      </section>

      {/* Status pill — colored by outcome / phase. */}
      <div
        className={[
          "rounded-2xl px-4 py-3 text-center border transition-colors",
          aggregateOutcome === "win" || aggregateOutcome === "blackjack"
            ? "border-accent-success/40 bg-accent-success/10 text-accent-success shadow-[0_0_24px_rgba(34,197,94,0.18)]"
            : aggregateOutcome === "lose"
              ? "border-accent-danger/40 bg-accent-danger/10 text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.18)]"
              : aggregateOutcome === "push"
                ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                : "glass",
        ].join(" ")}
      >
        <div className="text-sm font-semibold">{statusText}</div>
        {lastXp != null && phase === "settled" && (
          <div className="mt-1 text-xs text-accent-neon font-semibold animate-fade-in">
            +{lastXp} XP
          </div>
        )}
      </div>

      {/* Dealer hand — green felt look */}
      <section className="rounded-3xl p-4 sm:p-5 shadow-soft animate-rise relative overflow-hidden border border-emerald-400/15">
        <div
          className="pointer-events-none absolute inset-0 opacity-95"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, rgba(16,185,129,0.18), transparent 70%), linear-gradient(180deg, rgba(6,78,59,0.55), rgba(2,44,34,0.55))",
          }}
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white/85 flex items-center gap-2">
              <span className="text-base">🎩</span> {t("blackjack.dealer")}
            </span>
            <span className="chip text-[11px] tabular-nums bg-black/30 border-white/15">
              {phase === "player" ? `${dealerVisibleTotal} + ?` : dealerVisibleTotal}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {dealer.map((c, i) => (
              <PlayingCard
                key={c.id}
                card={c}
                hidden={phase === "player" && i === 1}
                delay={i * 90}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Player hand(s) — one section per hand, active one glows accent */}
      {hands.map((h, hi) => {
        const total = handTotal(h);
        const bust = total > 21;
        const isActive = phase === "player" && hi === activeHand;
        const result = phase === "settled" ? outcomes[hi] : null;
        return (
          <section
            key={hi}
            className={[
              "rounded-3xl p-4 sm:p-5 shadow-soft animate-rise relative overflow-hidden border transition-all",
              isActive
                ? "border-accent-glow/60 ring-2 ring-accent-glow/30"
                : "border-accent/20",
              phase === "player" && !isActive ? "opacity-70" : "",
            ].join(" ")}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-95"
              style={{
                background:
                  "radial-gradient(120% 80% at 50% 100%, rgba(124,92,255,0.18), transparent 70%), linear-gradient(180deg, rgba(2,44,34,0.45), rgba(6,78,59,0.55))",
              }}
              aria-hidden
            />
            <div className="relative">
              <div className="flex items-center justify-between mb-3 gap-2">
                <span className="text-sm font-semibold text-white/85 flex items-center gap-2">
                  <span className="text-base">🃏</span>
                  {hands.length > 1
                    ? `${t("blackjack.hand")} ${hi + 1}`
                    : t("blackjack.you")}
                  {isActive && hands.length > 1 && (
                    <span className="chip text-[10px] py-0 bg-accent/30 border-accent/40 text-accent-glow">
                      ●
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {result && (
                    <span
                      className={[
                        "chip text-[10px] py-0 bg-black/30 border-white/15 uppercase tracking-wider",
                        result === "win" || result === "blackjack"
                          ? "text-accent-success"
                          : result === "lose"
                            ? "text-accent-danger"
                            : "text-amber-200",
                      ].join(" ")}
                    >
                      {result === "blackjack"
                        ? t("blackjack.blackjack")
                        : result === "win"
                          ? t("blackjack.you_win")
                          : result === "lose"
                            ? t("blackjack.you_lose")
                            : t("blackjack.push")}
                    </span>
                  )}
                  <span
                    className={[
                      "chip text-[11px] tabular-nums bg-black/30 border-white/15",
                      bust
                        ? "text-accent-danger"
                        : total === 21
                          ? "text-accent-success"
                          : "",
                    ].join(" ")}
                  >
                    {total}
                    {bust ? ` · ${t("blackjack.bust")}` : ""}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {h.map((c, i) => (
                  <PlayingCard key={c.id} card={c} delay={i * 90} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {phase === "player" && (
          <>
            <button type="button" onClick={hit} className="btn-primary flex-1 min-w-[110px]">
              {t("blackjack.hit")}
            </button>
            <button type="button" onClick={stand} className="btn-ghost flex-1 min-w-[110px]">
              {t("blackjack.stand")}
            </button>
            {splittable && (
              <button
                type="button"
                onClick={split}
                className="btn-ghost flex-1 min-w-[110px] border border-accent-glow/40 text-accent-glow"
              >
                ✂ {t("blackjack.split")}
              </button>
            )}
          </>
        )}
        {phase === "settled" && (
          <>
            <button type="button" onClick={startRound} className="btn-primary flex-1 min-w-[140px]">
              {t("blackjack.next_round")}
            </button>
            <button
              type="button"
              onClick={() => {
                setScore({ wins: 0, losses: 0, pushes: 0 });
                shoeRef.current = buildShoe();
                startRound();
              }}
              className="btn-ghost"
            >
              {t("blackjack.reset_scores")}
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-white/45 text-center">
        {t("blackjack.tip" as TranslationKey)}
      </p>
      <Confetti ticks={confettiTick} enabled={settings.animations} />
    </main>
  );
}
