import type { Achievement } from "../types";

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_steps",
    titleKey: "ach.first_steps.title",
    descriptionKey: "ach.first_steps.desc",
    icon: "🌱",
    test: ({ progress }) => progress.stats.gamesWon >= 1,
  },
  {
    id: "perfectionist",
    titleKey: "ach.perfectionist.title",
    descriptionKey: "ach.perfectionist.desc",
    icon: "✨",
    test: ({ lastResult }) =>
      !!lastResult && lastResult.passed && lastResult.mistakes === 0,
  },
  {
    id: "level_10",
    titleKey: "ach.level_10.title",
    descriptionKey: "ach.level_10.desc",
    icon: "🔓",
    test: ({ progress }) => progress.highestUnlockedLevel >= 10,
  },
  {
    id: "level_25",
    titleKey: "ach.level_25.title",
    descriptionKey: "ach.level_25.desc",
    icon: "🚀",
    test: ({ progress }) => progress.highestUnlockedLevel >= 25,
  },
  {
    id: "level_50",
    titleKey: "ach.level_50.title",
    descriptionKey: "ach.level_50.desc",
    icon: "🏔️",
    test: ({ progress }) => progress.highestUnlockedLevel >= 50,
  },
  {
    id: "level_75",
    titleKey: "ach.level_75.title",
    descriptionKey: "ach.level_75.desc",
    icon: "⚡",
    test: ({ progress }) => progress.highestUnlockedLevel >= 75,
  },
  {
    id: "level_100",
    titleKey: "ach.level_100.title",
    descriptionKey: "ach.level_100.desc",
    icon: "👑",
    test: ({ progress }) => progress.highestUnlockedLevel >= 100,
  },
  {
    id: "streak_5",
    titleKey: "ach.streak_5.title",
    descriptionKey: "ach.streak_5.desc",
    icon: "🔥",
    test: ({ progress }) => progress.stats.longestStreak >= 5,
  },
  {
    id: "streak_15",
    titleKey: "ach.streak_15.title",
    descriptionKey: "ach.streak_15.desc",
    icon: "🌋",
    test: ({ progress }) => progress.stats.longestStreak >= 15,
  },
  {
    id: "marathon",
    titleKey: "ach.marathon.title",
    descriptionKey: "ach.marathon.desc",
    icon: "🏃",
    test: ({ progress }) => progress.stats.gamesPlayed >= 50,
  },
  {
    id: "veteran",
    titleKey: "ach.veteran.title",
    descriptionKey: "ach.veteran.desc",
    icon: "🎖️",
    test: ({ progress }) => progress.stats.gamesPlayed >= 200,
  },
  {
    id: "lightning",
    titleKey: "ach.lightning.title",
    descriptionKey: "ach.lightning.desc",
    icon: "⚡",
    test: ({ lastResult }) =>
      !!lastResult && lastResult.passed && lastResult.timeMs <= 12000,
  },
  {
    id: "all_three_stars_easy",
    titleKey: "ach.three_stars_easy.title",
    descriptionKey: "ach.three_stars_easy.desc",
    icon: "⭐",
    test: ({ progress }) => {
      for (let i = 1; i <= 20; i++) {
        const r = progress.records[i];
        if (!r || r.stars < 3) return false;
      }
      return true;
    },
  },
  {
    id: "daily_devotee",
    titleKey: "ach.daily.title",
    descriptionKey: "ach.daily.desc",
    icon: "📅",
    test: ({ progress }) => progress.daily.consecutiveDays >= 7,
  },
];

export function findNewlyUnlocked(
  ctx: Parameters<Achievement["test"]>[0],
  alreadyUnlocked: string[]
): Achievement[] {
  const set = new Set(alreadyUnlocked);
  return ACHIEVEMENTS.filter((a) => !set.has(a.id) && a.test(ctx));
}
