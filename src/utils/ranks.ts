import type { Rank } from "../types";

export const RANKS: Rank[] = [
  {
    nameKey: "rank.novice",
    minXp: 0,
    icon: "★",
    gradient: "from-slate-400 to-slate-600",
  },
  {
    nameKey: "rank.trainee",
    minXp: 600,
    icon: "✦",
    gradient: "from-sky-400 to-cyan-500",
  },
  {
    nameKey: "rank.apprentice",
    minXp: 1800,
    icon: "✧",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    nameKey: "rank.adept",
    minXp: 4200,
    icon: "✪",
    gradient: "from-violet-400 to-fuchsia-500",
  },
  {
    nameKey: "rank.expert",
    minXp: 9000,
    icon: "❖",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    nameKey: "rank.master",
    minXp: 18000,
    icon: "✺",
    gradient: "from-rose-400 to-pink-500",
  },
  {
    nameKey: "rank.grandmaster",
    minXp: 36000,
    icon: "♛",
    gradient: "from-yellow-300 via-amber-400 to-rose-500",
  },
  {
    nameKey: "rank.legend",
    minXp: 60000,
    icon: "♕",
    gradient: "from-cyan-300 via-fuchsia-400 to-amber-300",
  },
];

export function rankFor(xp: number): { rank: Rank; index: number; next: Rank | null; progress: number } {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) index = i;
    else break;
  }
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const progress = next
    ? Math.min(1, (xp - rank.minXp) / Math.max(1, next.minXp - rank.minXp))
    : 1;
  return { rank, index, next, progress };
}
