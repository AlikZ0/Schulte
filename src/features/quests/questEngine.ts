import type { Quest, RunResult } from "../../types";
import type { QuestKindKey } from "./questsConfig";

/**
 * Folds a RunResult into the player's active quests, returning a fresh quest
 * array along with reward totals for any quest that completed during the run.
 */
export function reduceQuestsAfterRun(
  quests: Quest[],
  result: RunResult,
): {
  quests: Quest[];
  rewardXp: number;
  rewardSkillPoints: number;
  newlyCompleted: Quest[];
} {
  let rewardXp = 0;
  let rewardSkillPoints = 0;
  const newlyCompleted: Quest[] = [];

  const next = quests.map((q) => {
    if (q.completed) return q;
    const inc = increment(q.kindKey as QuestKindKey, result);
    if (inc <= 0) return q;
    const progress = Math.min(q.goal, q.progress + inc);
    const completed = progress >= q.goal;
    if (completed) {
      rewardXp += q.rewardXp;
      rewardSkillPoints += q.rewardSkillPoints;
      const updated = { ...q, progress, completed: true };
      newlyCompleted.push(updated);
      return updated;
    }
    return { ...q, progress };
  });

  return { quests: next, rewardXp, rewardSkillPoints, newlyCompleted };
}

function increment(kind: QuestKindKey, r: RunResult): number {
  switch (kind) {
    case "quest.win_3":
      return r.passed ? 1 : 0;
    case "quest.no_mistakes":
      return r.passed && r.mistakes === 0 ? 1 : 0;
    case "quest.combo_8":
      return r.passed && r.comboMax >= 8 ? Math.min(r.comboMax, 16) : 0;
    case "quest.complete_under":
      // Goal is a millisecond threshold; treat as "complete one run under it".
      return r.passed && r.timeMs <= 30000 ? 30000 : 0;
    case "quest.daily_one":
      return r.passed && r.mode === "daily" ? 1 : 0;
    case "quest.zen_session":
      return r.passed && r.mode === "zen" ? 1 : 0;
    case "quest.speedrun_one":
      return r.passed && r.mode === "speedrun" ? 1 : 0;
    default:
      return 0;
  }
}
