import type { SkillRanks } from "../../types";

export type SkillId = keyof SkillRanks;

export interface SkillDef {
  id: SkillId;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  /** Max ranks. */
  maxRank: number;
  /** Returns the bonus value at the given rank. Linear ramp by default. */
  bonusAt: (rank: number) => number;
  /** Cosmetic rank labels (filled inside the bar). */
  unitKey?: string;
}

export const SKILLS: SkillDef[] = [
  {
    id: "focus",
    nameKey: "skill.focus",
    descriptionKey: "skill.focus.desc",
    icon: "👁",
    maxRank: 5,
    bonusAt: (r) => r * 0.05, // up to +25% star-time leeway
    unitKey: "skill.unit.tolerance",
  },
  {
    id: "memory",
    nameKey: "skill.memory",
    descriptionKey: "skill.memory.desc",
    icon: "🧠",
    maxRank: 5,
    bonusAt: (r) => r * 250, // ms added to MEMORIZE preview
    unitKey: "skill.unit.ms",
  },
  {
    id: "speed",
    nameKey: "skill.speed",
    descriptionKey: "skill.speed.desc",
    icon: "⚡",
    maxRank: 5,
    bonusAt: (r) => r * 0.05, // +5% XP per rank
    unitKey: "skill.unit.xp",
  },
  {
    id: "accuracy",
    nameKey: "skill.accuracy",
    descriptionKey: "skill.accuracy.desc",
    icon: "🎯",
    maxRank: 5,
    bonusAt: (r) => r, // -1 mistake forgiveness per rank (capped at lives)
    unitKey: "skill.unit.lives",
  },
];

export function totalAllocated(skills: SkillRanks): number {
  return skills.focus + skills.memory + skills.speed + skills.accuracy;
}

export function maxAllocatable(skillPoints: number, skills: SkillRanks): number {
  return skillPoints + totalAllocated(skills);
}
