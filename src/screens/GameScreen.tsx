import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GameMode, GameStatus, RunResult } from "../types";
import { GameBoard } from "../components/GameBoard";
import { Timer } from "../components/Timer";
import { TargetIndicator } from "../components/TargetIndicator";
import { LivesIndicator } from "../components/LivesIndicator";
import { ModifierBadges } from "../components/ModifierBadges";
import { LevelCompleteModal } from "../components/LevelCompleteModal";
import { ScreenFlash } from "../components/ScreenFlash";
import { Confetti } from "../components/Confetti";

import { useTimer } from "../hooks/useTimer";
import { useSound } from "../hooks/useSound";
import { useKeyboard } from "../hooks/useKeyboard";
import { useHaptics } from "../hooks/useHaptics";
import { useScreenFlash } from "../hooks/useScreenFlash";
import { useTelemetry } from "../hooks/useTelemetry";

import { generateBoard } from "../utils/shuffle";
import { hashString, todayKey } from "../utils/seedRandom";
import { TOTAL_LEVELS, starsFor, xpAwardFor } from "../utils/levels";

import { configureMode } from "../features/modes/modes";
import { applySkillBonuses, xpMultiplier } from "../features/skills/applySkills";

import { useProgress } from "../store/ProgressContext";
import { useSettings } from "../store/SettingsContext";

interface GameScreenProps {
  level: number;
  mode: GameMode;
  onExit: () => void;
  onChangeLevel: (level: number) => void;
  onIntensityChange?: (intensity: number) => void;
  onAchievementsUnlocked: (ids: string[]) => void;
  onLevelUp: (newHighest: number) => void;
}

export function GameScreen({
  level,
  mode,
  onExit,
  onChangeLevel,
  onIntensityChange,
  onAchievementsUnlocked,
  onLevelUp,
}: GameScreenProps) {
  const { settings, t } = useSettings();
  const { progress, isUnlocked, recordRun, registerDailyResult } = useProgress();
  const track = useTelemetry();
  const haptic = useHaptics(settings.haptics);
  const { flash, trigger: triggerFlash } = useScreenFlash();
  const [confettiTick, setConfettiTick] = useState(0);
  const [shakeTick, setShakeTick] = useState(0);

  // Daily mode promotes a level-32 base config but uses a deterministic seed.
  const baseLevel = mode === "daily" ? 32 : level;

  // Compose: base level → mode tweaks → skill bonuses.
  const config = useMemo(() => {
    return applySkillBonuses(configureMode(mode, baseLevel), progress.skills);
  }, [mode, baseLevel, progress.skills]);

  const dailySeed = useMemo(() => hashString(`stt-daily-${todayKey()}`), []);

  const buildBoard = useCallback(() => {
    if (mode === "daily") return generateBoard(config.size, dailySeed);
    return generateBoard(config.size);
  }, [mode, config.size, dailySeed]);

  const reverse = config.modifiers.includes("REVERSE");
  const total = config.size * config.size;
  const initialTarget = reverse ? total : 1;

  const [numbers, setNumbers] = useState<number[]>(() => buildBoard());
  const [found, setFound] = useState<Set<number>>(() => new Set());
  const [target, setTarget] = useState<number>(initialTarget);
  const [wrong, setWrong] = useState<number | null>(null);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [livesLeft, setLivesLeft] = useState<number>(config.lives);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboMax, setComboMax] = useState(0);
  const [memorizeUntil, setMemorizeUntil] = useState<number | null>(null);
  const [memorizing, setMemorizing] = useState(false);
  const [resultModal, setResultModal] = useState<RunResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const lastClickRef = useRef<number>(0);
  const reactionsRef = useRef<number[]>([]);
  const wrongTimeoutRef = useRef<number | null>(null);
  const memorizeTimeoutRef = useRef<number | null>(null);
  const peekTimeoutRef = useRef<number | null>(null);
  const mistakeIndicesRef = useRef<number[]>([]);

  // When MEMORIZE is active, briefly reveal the entire board after each
  // correct click so the player can re-orient themselves.
  const [peekActive, setPeekActive] = useState(false);

  const { elapsed, running, start, stop, reset, bump } = useTimer();
  const { play } = useSound(settings.sound);

  const hintsAlwaysOn = settings.difficultyAssist;
  const hasMemorize = config.modifiers.includes("MEMORIZE");
  const hasLives = config.modifiers.includes("LIMITED_LIVES");

  // Drive music intensity (0..1) from current combo for the parent.
  useEffect(() => {
    onIntensityChange?.(Math.min(1, combo / 12));
  }, [combo, onIntensityChange]);

  /* ── Game lifecycle ──────────────────────────────────────────────────── */

  const beginRun = useCallback(() => {
    if (wrongTimeoutRef.current != null) {
      window.clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = null;
    }
    if (memorizeTimeoutRef.current != null) {
      window.clearTimeout(memorizeTimeoutRef.current);
      memorizeTimeoutRef.current = null;
    }
    if (peekTimeoutRef.current != null) {
      window.clearTimeout(peekTimeoutRef.current);
      peekTimeoutRef.current = null;
    }
    setPeekActive(false);

    reset();
    setNumbers(buildBoard());
    setFound(new Set());
    setTarget(reverse ? total : 1);
    setWrong(null);
    setLivesLeft(config.lives);
    setMistakes(0);
    setCombo(0);
    setComboMax(0);
    reactionsRef.current = [];
    mistakeIndicesRef.current = [];
    lastClickRef.current = 0;
    setResultModal(null);
    setModalOpen(false);

    if (hasMemorize && config.memorizeMs > 0) {
      setStatus("memorizing");
      setMemorizing(true);
      setMemorizeUntil(performance.now() + config.memorizeMs);
      memorizeTimeoutRef.current = window.setTimeout(() => {
        setMemorizing(false);
        setStatus("running");
        lastClickRef.current = performance.now();
        start();
      }, config.memorizeMs);
    } else {
      setStatus("running");
      lastClickRef.current = performance.now();
      requestAnimationFrame(() => start());
    }
    track("level_start", { level: config.level, mode });
  }, [
    reset,
    buildBoard,
    reverse,
    total,
    config.lives,
    config.memorizeMs,
    config.level,
    hasMemorize,
    start,
    track,
    mode,
  ]);

  useEffect(() => {
    beginRun();
    return () => {
      if (wrongTimeoutRef.current != null) window.clearTimeout(wrongTimeoutRef.current);
      if (memorizeTimeoutRef.current != null) window.clearTimeout(memorizeTimeoutRef.current);
      if (peekTimeoutRef.current != null) window.clearTimeout(peekTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, mode]);

  /* ── Win / fail handling ─────────────────────────────────────────────── */

  const finishRun = useCallback(
    (passed: boolean, finalTime: number, finalMistakes: number) => {
      const samples = reactionsRef.current;
      const reactionAvg =
        samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;

      const correctCount = total - finalMistakes;
      const accuracy = total === 0 ? 0 : Math.max(0, correctCount / total);

      const stars = passed ? starsFor(finalTime, config.targetMs, finalMistakes) : 0;
      const isFirstClear = passed && !progress.records[config.level]?.completed;
      const baseXp = passed
        ? xpAwardFor(config, finalTime, finalMistakes, isFirstClear)
        : Math.round(config.baseXp * 0.15);
      const xpEarned = Math.round(baseXp * xpMultiplier(progress.skills, progress.prestige.xpMultiplier));

      const prevBest = progress.records[config.level]?.bestTimeMs ?? 0;
      const isNewBest = passed && (prevBest === 0 || finalTime < prevBest);

      const result: RunResult = {
        level: config.level,
        size: config.size,
        mode,
        timeMs: finalTime,
        mistakes: finalMistakes,
        accuracy,
        xpEarned,
        stars,
        comboMax,
        reactionAvgMs: reactionAvg,
        isNewBest,
        passed,
        mistakeIndices: mistakeIndicesRef.current.slice(),
      };

      setResultModal(result);
      setModalOpen(true);

      if (passed) {
        triggerFlash("success");
        setConfettiTick((c) => c + 1);
        haptic("success");
      } else {
        triggerFlash("fail");
        haptic("error");
      }
      play(passed ? "complete" : "fail");

      if (mode === "daily" && passed) registerDailyResult(finalTime);

      const { newlyUnlockedAchievementIds, leveledUp } = recordRun(
        config.level,
        result,
        isFirstClear,
      );

      if (leveledUp) {
        play("unlock");
        onLevelUp(Math.min(TOTAL_LEVELS, config.level + 1));
      }
      if (newlyUnlockedAchievementIds.length > 0) {
        onAchievementsUnlocked(newlyUnlockedAchievementIds);
      }
      track("level_finish", {
        level: config.level,
        mode,
        passed,
        timeMs: finalTime,
        mistakes: finalMistakes,
        stars,
        xpEarned,
      });
    },
    [
      total,
      config,
      comboMax,
      mode,
      progress.records,
      progress.skills,
      progress.prestige.xpMultiplier,
      play,
      registerDailyResult,
      recordRun,
      triggerFlash,
      haptic,
      onAchievementsUnlocked,
      onLevelUp,
      track,
    ],
  );

  /* ── Tile click handling ─────────────────────────────────────────────── */

  const handleTileClick = useCallback(
    (value: number) => {
      if (status !== "running") return;
      if (found.has(value)) return;

      const isCorrect = value === target;
      const idx = numbers.indexOf(value);

      if (isCorrect) {
        const now = performance.now();
        const dt = lastClickRef.current ? now - lastClickRef.current : 0;
        if (dt > 0 && dt < 5000) reactionsRef.current.push(dt);
        lastClickRef.current = now;

        play("correct");
        haptic("tap");

        const nextFound = new Set(found);
        nextFound.add(value);
        setFound(nextFound);

        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo > comboMax) setComboMax(newCombo);

        if (nextFound.size === total) {
          const finalTime = stop();
          setStatus("completed");
          finishRun(true, finalTime, mistakes);
        } else {
          setTarget((t) => (reverse ? t - 1 : t + 1));
          // MEMORIZE is brutal at 7×7 — give a brief peek after each
          // correct click so the player can re-orient without breaking
          // the memory challenge entirely.
          if (hasMemorize) {
            setPeekActive(true);
            if (peekTimeoutRef.current != null) {
              window.clearTimeout(peekTimeoutRef.current);
            }
            peekTimeoutRef.current = window.setTimeout(() => {
              setPeekActive(false);
              peekTimeoutRef.current = null;
            }, 450);
          }
        }
      } else {
        play("wrong");
        haptic("warning");
        setShakeTick((s) => s + 1);
        setWrong(value);
        setCombo(0);
        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);
        if (idx >= 0) mistakeIndicesRef.current.push(idx);

        if (config.penaltyMs > 0) bump(config.penaltyMs);

        if (hasLives) {
          const newLives = livesLeft - 1;
          setLivesLeft(newLives);
          if (newLives <= 0) {
            const finalTime = stop();
            setStatus("failed");
            finishRun(false, finalTime, newMistakes);
            return;
          }
        }

        if (wrongTimeoutRef.current != null) window.clearTimeout(wrongTimeoutRef.current);
        wrongTimeoutRef.current = window.setTimeout(() => {
          setWrong(null);
          wrongTimeoutRef.current = null;
        }, 380);
      }
    },
    [
      status,
      found,
      target,
      numbers,
      total,
      reverse,
      combo,
      comboMax,
      mistakes,
      livesLeft,
      hasLives,
      hasMemorize,
      config.penaltyMs,
      play,
      haptic,
      stop,
      bump,
      finishRun,
    ],
  );

  useKeyboard({
    onNumber: (n) => {
      if (status === "running") handleTileClick(n);
    },
    onRestart: () => beginRun(),
    onEscape: onExit,
    enabled: !modalOpen,
  });

  /* ── Memorize phase progress (visual countdown) ──────────────────────── */
  const [memorizeProgress, setMemorizeProgress] = useState(0);
  useEffect(() => {
    if (!memorizing || memorizeUntil == null) {
      setMemorizeProgress(0);
      return;
    }
    let raf = 0;
    const totalDur = config.memorizeMs;
    const start = performance.now();
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / totalDur);
      setMemorizeProgress(p);
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [memorizing, memorizeUntil, config.memorizeMs]);

  const targetForBoard = status === "running" ? target : null;
  const hideHint = config.modifiers.includes("HIDE_HINT") && !hintsAlwaysOn;

  const nextLevel = config.level + 1;
  const canGoNext =
    mode === "campaign" &&
    nextLevel <= TOTAL_LEVELS &&
    isUnlocked(nextLevel) &&
    resultModal?.passed;

  // Restart shake animation by remounting the wrapper.
  const shakeKey = shakeTick;

  return (
    <main
      className="w-full max-w-5xl mx-auto px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5 has-bottom-nav animate-fade-in"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 8px)",
      }}
    >
      <div className="hud-sticky flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="btn-ghost h-10 px-3 rounded-2xl"
            aria-label={t("common.back")}
          >
            ←
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/45">
              {mode === "daily" ? t("daily.title") : `${t("levels.level")} ${config.level}`}
            </div>
            <div className="font-semibold text-sm">
              {config.size} × {config.size}
              {reverse ? ` · ${t("modifier.REVERSE")}` : ""}
            </div>
          </div>
        </div>
        <button type="button" onClick={() => beginRun()} className="btn-primary h-10 px-4">
          ↻ {t("common.restart")}
        </button>
      </div>

      <ModifierBadges modifiers={config.modifiers} />

      <div className="flex flex-wrap items-stretch gap-3">
        <TargetIndicator
          target={targetForBoard}
          total={total}
          found={found.size}
          hidden={hideHint}
          label={reverse ? t("game.next") + " ↓" : t("game.next")}
        />
        <Timer ms={elapsed} active={running} targetMs={config.targetMs} label={t("game.time")} />
        {hasLives && <LivesIndicator lives={livesLeft} max={config.lives} />}
        <div className="glass rounded-2xl px-4 py-3 flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
            {t("game.combo")}
          </span>
          <span className="font-mono text-xl font-bold tabular-nums text-accent-neon">
            ×{combo}
          </span>
        </div>
      </div>

      <div className="relative" key={shakeKey}>
        <div className={shakeKey > 0 ? "animate-screen-shake" : ""}>
          <GameBoard
            config={config}
            numbers={numbers}
            found={found}
            wrong={wrong}
            target={status === "running" ? target : null}
            forceShowAll={memorizing || peekActive}
            forceHideAll={status === "running" && hasMemorize && !peekActive}
            hintOverride={hintsAlwaysOn}
            disabled={status !== "running"}
            onTileClick={handleTileClick}
          />
        </div>
        {memorizing && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none animate-fade-in">
            <div className="glass rounded-2xl px-5 py-4 text-center">
              <div className="text-sm text-white/70">{t("game.memorize")}</div>
              <div className="mt-2 h-1.5 w-40 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-neon"
                  style={{ width: `${memorizeProgress * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ScreenFlash kind={flash.kind} ticks={flash.ticks} />
      <Confetti ticks={confettiTick} enabled={settings.animations} />

      <LevelCompleteModal
        open={modalOpen}
        result={resultModal}
        onClose={() => setModalOpen(false)}
        onReplay={() => {
          setModalOpen(false);
          beginRun();
        }}
        onMenu={() => {
          setModalOpen(false);
          onExit();
        }}
        onNext={
          canGoNext
            ? () => {
                setModalOpen(false);
                onChangeLevel(nextLevel);
              }
            : undefined
        }
      />
    </main>
  );
}
