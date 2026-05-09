import type { SessionEntry } from "../types";

/**
 * Returns a level recommendation based on the player's recent performance,
 * clamped to the current unlock window.
 *
 * The recommendation drifts up if the player wins comfortably (avg star-time
 * margin and clean accuracy), down if they're failing or struggling.
 */
export function recommendLevel(
  sessions: SessionEntry[],
  highestUnlocked: number,
): number {
  const recent = sessions.slice(-10);
  if (recent.length === 0) return Math.max(1, Math.min(highestUnlocked, 1));

  const winRate =
    recent.filter((s) => s.passed).length / recent.length;
  const avgMistakes =
    recent.reduce((acc, s) => acc + s.mistakes, 0) / recent.length;

  let target = Math.max(1, highestUnlocked - 2);
  if (winRate >= 0.85 && avgMistakes <= 1.5) target = highestUnlocked;
  else if (winRate >= 0.6) target = Math.max(1, highestUnlocked - 1);
  else target = Math.max(1, highestUnlocked - 3);

  return Math.min(highestUnlocked, target);
}

/** Composite focus score 0..100 derived from recent runs. */
export function focusScore(sessions: SessionEntry[]): number {
  const recent = sessions.slice(-25);
  if (recent.length === 0) return 0;
  const won = recent.filter((s) => s.passed).length;
  const winRate = won / recent.length;
  const avgMistakes =
    recent.reduce((acc, s) => acc + s.mistakes, 0) / recent.length;
  const mistakePenalty = Math.min(40, avgMistakes * 8);
  const score = winRate * 100 - mistakePenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}
