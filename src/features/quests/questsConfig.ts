import type { Quest } from "../../types";

export type QuestKindKey =
  | "quest.win_3"
  | "quest.no_mistakes"
  | "quest.combo_8"
  | "quest.complete_under"
  | "quest.daily_one"
  | "quest.zen_session"
  | "quest.speedrun_one";

export interface QuestKind {
  key: QuestKindKey;
  goal: number;
  rewardXp: number;
  rewardSkillPoints: number;
}

export const QUEST_KINDS: QuestKind[] = [
  { key: "quest.win_3", goal: 3, rewardXp: 200, rewardSkillPoints: 0 },
  { key: "quest.no_mistakes", goal: 1, rewardXp: 250, rewardSkillPoints: 1 },
  { key: "quest.combo_8", goal: 8, rewardXp: 200, rewardSkillPoints: 0 },
  { key: "quest.complete_under", goal: 30000, rewardXp: 220, rewardSkillPoints: 0 },
  { key: "quest.daily_one", goal: 1, rewardXp: 150, rewardSkillPoints: 1 },
  { key: "quest.zen_session", goal: 1, rewardXp: 100, rewardSkillPoints: 0 },
  { key: "quest.speedrun_one", goal: 1, rewardXp: 250, rewardSkillPoints: 1 },
];

/**
 * Pseudo-random rotating quest selection driven by the ISO date so the same
 * day always yields the same three quests.
 */
export function rollDailyQuests(period: string, count = 3): Quest[] {
  let hash = 0x811c9dc5;
  for (let i = 0; i < period.length; i++) {
    hash ^= period.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  const picks: Quest[] = [];
  const used = new Set<number>();
  let cursor = hash;
  while (picks.length < count) {
    cursor = (cursor * 1664525 + 1013904223) >>> 0;
    const idx = cursor % QUEST_KINDS.length;
    if (used.has(idx)) continue;
    used.add(idx);
    const kind = QUEST_KINDS[idx];
    picks.push({
      id: `${period}-${kind.key}`,
      period,
      goal: kind.goal,
      progress: 0,
      completed: false,
      rewardXp: kind.rewardXp,
      rewardSkillPoints: kind.rewardSkillPoints,
      kindKey: kind.key,
    });
    if (used.size >= QUEST_KINDS.length) break;
  }
  return picks;
}
