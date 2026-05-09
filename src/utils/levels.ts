import type { LevelConfig, LevelTier, Modifier } from "../types";

export const TOTAL_LEVELS = 100;

/* ──────────────────────────────────────────────────────────────────────────
   Tier mapping
   ──────────────────────────────────────────────────────────────────────── */

export function tierForLevel(level: number): LevelTier {
  if (level <= 20) return "easy";
  if (level <= 45) return "medium";
  if (level <= 75) return "hard";
  return "expert";
}

function sizeForLevel(level: number): number {
  if (level <= 3) return 3;
  if (level <= 8) return 4;
  if (level <= 30) return 5;
  if (level <= 65) return 6;
  return 7;
}

function targetTimeMs(level: number, size: number): number {
  // Loose, hand-tuned curve. Smaller boards are faster; tier multiplier compresses time.
  const cells = size * size;
  const base = cells * 1100; // ms per tile, baseline
  const tier = tierForLevel(level);
  const tighten =
    tier === "easy" ? 1 : tier === "medium" ? 0.85 : tier === "hard" ? 0.7 : 0.55;
  // Shave a bit off as the level number rises within its tier.
  const intra = 1 - Math.min(0.18, ((level - 1) % 25) * 0.006);
  return Math.round(base * tighten * intra);
}

function modifiersForLevel(level: number): Modifier[] {
  const mods = new Set<Modifier>();
  // Easy: no modifiers.
  if (level <= 8) return [];

  // ── Medium tier: introduce visual distractions and pace pressure.
  //     Numbers stay visible at all times — readability over gimmicks.
  if (level >= 9) mods.add("HIDE_HINT");
  if (level >= 26 && level % 3 === 0) mods.add("DISTRACTORS");
  if (level >= 31) mods.add("TIME_PENALTY");
  if (level >= 36) mods.add("BLINK");
  if (level >= 41 && level % 2 === 0) mods.add("REVERSE");

  // ── Hard tier: stakes + chaos.
  if (level >= 46) mods.add("LIMITED_LIVES");
  if (level >= 50) mods.add("JITTER");
  if (level >= 60 && level % 4 === 0) mods.add("ROTATE");
  if (level >= 66) mods.add("DISTRACTORS");

  // ── Expert tier: rotate the "hide" mechanic so MEMORIZE never stacks
  //                with PARTIAL_INVIS / FAKE_NUMBERS (they all hide tiles).
  if (level >= 71 && level <= 75) mods.add("PARTIAL_INVIS");
  if (level >= 76 && level <= 85) mods.add("MEMORIZE");
  if (level >= 86) mods.add("FAKE_NUMBERS");
  if (level >= 81) mods.add("ROTATE");
  if (level >= 91) mods.add("BLINK");

  // ── Boss stretch (96-100): everything stacked, but numbers still visible.
  if (level >= 96) {
    mods.add("REVERSE");
    mods.add("JITTER");
    mods.add("BLINK");
    mods.add("ROTATE");
    mods.add("DISTRACTORS");
  }

  // Final mutual exclusions — defensive.
  if (mods.has("MEMORIZE")) {
    mods.delete("PARTIAL_INVIS");
    mods.delete("FAKE_NUMBERS");
  }
  // Numbers must remain readable. FADE is an opt-in mechanic only —
  // currently never auto-applied to a level.
  mods.delete("FADE");

  return Array.from(mods);
}

function livesForLevel(level: number): number {
  if (level < 46) return 999; // effectively unlimited
  if (level < 66) return 5;
  if (level < 86) return 3;
  return 2;
}

function penaltyMsForLevel(level: number): number {
  if (level < 31) return 0;
  if (level < 51) return 1500;
  if (level < 76) return 2500;
  return 4000;
}

function memorizeMsForLevel(level: number, size: number): number {
  // Only relevant when MEMORIZE is on (76–85). Scale with grid so 7×7
  // gets a humane preview window.
  if (level < 55) return 0;
  // ~140ms per cell on top of a 1.4s base ≈ 4.3s for 5×5, 6.4s for 7×7.
  return Math.round(1400 + size * size * 140);
}

function baseXpForLevel(level: number): number {
  const tier = tierForLevel(level);
  const tierBonus =
    tier === "easy" ? 0 : tier === "medium" ? 50 : tier === "hard" ? 150 : 300;
  return 60 + level * 8 + tierBonus;
}

/* ──────────────────────────────────────────────────────────────────────────
   Public API
   ──────────────────────────────────────────────────────────────────────── */

export function getLevelConfig(level: number): LevelConfig {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(level)));
  const size = sizeForLevel(clamped);
  return {
    level: clamped,
    tier: tierForLevel(clamped),
    size,
    modifiers: modifiersForLevel(clamped),
    lives: livesForLevel(clamped),
    penaltyMs: penaltyMsForLevel(clamped),
    memorizeMs: memorizeMsForLevel(clamped, size),
    targetMs: targetTimeMs(clamped, size),
    baseXp: baseXpForLevel(clamped),
  };
}

export function allLevelConfigs(): LevelConfig[] {
  return Array.from({ length: TOTAL_LEVELS }, (_, i) => getLevelConfig(i + 1));
}

/* ──────────────────────────────────────────────────────────────────────────
   Star rating
   ──────────────────────────────────────────────────────────────────────── */

export function starsFor(timeMs: number, targetMs: number, mistakes: number): 0 | 1 | 2 | 3 {
  if (timeMs <= 0) return 0;
  if (mistakes === 0 && timeMs <= targetMs) return 3;
  if (timeMs <= targetMs * 1.25) return 2;
  if (timeMs <= targetMs * 1.6) return 1;
  return 1;
}

/* ──────────────────────────────────────────────────────────────────────────
   XP awarded for a run
   ──────────────────────────────────────────────────────────────────────── */

export function xpAwardFor(
  config: LevelConfig,
  timeMs: number,
  mistakes: number,
  isFirstClear: boolean
): number {
  const stars = starsFor(timeMs, config.targetMs, mistakes);
  const starMult = stars === 3 ? 1 : stars === 2 ? 0.75 : 0.5;
  const accuracyBonus = mistakes === 0 ? 1.15 : Math.max(0.6, 1 - mistakes * 0.05);
  const firstClearBonus = isFirstClear ? 1.4 : 0.5; // replays earn less
  return Math.round(config.baseXp * starMult * accuracyBonus * firstClearBonus);
}
