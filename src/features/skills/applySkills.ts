import type { LevelConfig, SkillRanks } from "../../types";
import { SKILLS } from "./skillsConfig";

/**
 * Returns a modified LevelConfig adjusted by the player's skill ranks.
 * Pure function — easy to memoise per-level.
 */
export function applySkillBonuses(
  config: LevelConfig,
  skills: SkillRanks,
): LevelConfig {
  const focus = SKILLS.find((s) => s.id === "focus")!.bonusAt(skills.focus);
  const memory = SKILLS.find((s) => s.id === "memory")!.bonusAt(skills.memory);
  const accuracy = SKILLS.find((s) => s.id === "accuracy")!.bonusAt(skills.accuracy);

  // Focus tweaks the target time: more focus → forgiving ★★★ window.
  const targetMs = Math.round(config.targetMs * (1 + focus));
  // Memory extends the MEMORIZE preview duration when present.
  const memorizeMs = config.memorizeMs > 0 ? config.memorizeMs + memory : 0;
  // Accuracy adds extra lives on LIMITED_LIVES levels.
  const lives = config.lives + Math.round(accuracy);

  return { ...config, targetMs, memorizeMs, lives };
}

/** Returns the XP multiplier from skills + prestige. */
export function xpMultiplier(skills: SkillRanks, prestigeMultiplier: number): number {
  const speed = SKILLS.find((s) => s.id === "speed")!.bonusAt(skills.speed);
  return (1 + speed) * prestigeMultiplier;
}
