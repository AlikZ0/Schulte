import type { GameMode, LevelConfig } from "../../types";
import { getLevelConfig } from "../../utils/levels";

export interface ModeMeta {
  id: GameMode;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  /** Required highest unlocked level to access this mode. */
  unlockLevel: number;
}

export const MODES: ModeMeta[] = [
  { id: "campaign",  nameKey: "mode.campaign",  descriptionKey: "mode.campaign.desc",  icon: "🎯", unlockLevel: 1 },
  { id: "trail",     nameKey: "mode.trail",     descriptionKey: "mode.trail.desc",     icon: "✨", unlockLevel: 1 },
  { id: "daily",     nameKey: "mode.daily",     descriptionKey: "mode.daily.desc",     icon: "☀",  unlockLevel: 1 },
  { id: "zen",       nameKey: "mode.zen",       descriptionKey: "mode.zen.desc",       icon: "🧘", unlockLevel: 5 },
  { id: "speedrun",  nameKey: "mode.speedrun",  descriptionKey: "mode.speedrun.desc",  icon: "⚡", unlockLevel: 15 },
  { id: "nightmare", nameKey: "mode.nightmare", descriptionKey: "mode.nightmare.desc", icon: "💀", unlockLevel: 75 },
];

/**
 * Tweaks the level config for the active game mode. Pure function so it
 * composes nicely with applySkillBonuses().
 */
export function configureMode(mode: GameMode, baseLevel: number): LevelConfig {
  const cfg = getLevelConfig(baseLevel);

  switch (mode) {
    case "zen":
      // Strip aggressive modifiers; remove time pressure entirely.
      return {
        ...cfg,
        modifiers: cfg.modifiers.filter(
          (m) => m !== "TIME_PENALTY" && m !== "LIMITED_LIVES" && m !== "FADE",
        ),
        lives: 999,
        penaltyMs: 0,
        targetMs: cfg.targetMs * 4,
      };
    case "speedrun":
      // Tighter target time, no penalties.
      return {
        ...cfg,
        targetMs: Math.max(8000, Math.round(cfg.targetMs * 0.6)),
        penaltyMs: 0,
        lives: 999,
        modifiers: cfg.modifiers.filter((m) => m !== "TIME_PENALTY" && m !== "LIMITED_LIVES"),
      };
    case "nightmare":
      // Stack the worst modifiers and shrink lives drastically.
      return {
        ...cfg,
        modifiers: Array.from(
          new Set([
            ...cfg.modifiers,
            "HIDE_HINT",
            "FADE",
            "BLINK",
            "JITTER",
            "ROTATE",
            "MEMORIZE",
            "TIME_PENALTY",
            "LIMITED_LIVES",
            "PARTIAL_INVIS",
          ]),
        ) as LevelConfig["modifiers"],
        lives: 1,
        penaltyMs: 5000,
        memorizeMs: cfg.memorizeMs > 0 ? cfg.memorizeMs : 1500,
        targetMs: Math.round(cfg.targetMs * 0.55),
        baseXp: Math.round(cfg.baseXp * 2),
      };
    case "trail":
      // Forces the TRAIL modifier on top of the base level. Drops MEMORIZE
      // because the trail itself becomes the memory aid, and gives a small
      // XP bump because the visual flair is satisfying to play.
      return {
        ...cfg,
        modifiers: Array.from(
          new Set([
            ...cfg.modifiers.filter((m) => m !== "MEMORIZE"),
            "TRAIL",
          ]),
        ) as LevelConfig["modifiers"],
        targetMs: Math.round(cfg.targetMs * 1.15),
        baseXp: Math.round(cfg.baseXp * 1.25),
      };
    case "daily":
    case "campaign":
    default:
      return cfg;
  }
}

export function isModeUnlocked(mode: GameMode, highestLevel: number): boolean {
  const meta = MODES.find((m) => m.id === mode);
  if (!meta) return false;
  return highestLevel >= meta.unlockLevel;
}
