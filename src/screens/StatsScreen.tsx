import { useMemo } from "react";
import { useProgress } from "../store/ProgressContext";
import { useSettings } from "../store/SettingsContext";
import { rankFor } from "../utils/ranks";
import { formatPct, formatTimeShort, formatNumber } from "../utils/formatTime";
import { TOTAL_LEVELS } from "../utils/levels";
import { focusScore } from "../utils/dynamicDifficulty";
import type { TranslationKey } from "../i18n";
import { XpBar } from "../components/XpBar";
import { SparkLine } from "../components/SparkLine";
import { Heatmap } from "../components/Heatmap";

export function StatsScreen() {
  const { progress } = useProgress();
  const { t } = useSettings();
  const { rank } = rankFor(progress.xp);

  const completedLevels = useMemo(
    () => Object.values(progress.records).filter((r) => r.completed).length,
    [progress.records],
  );

  const winRate =
    progress.stats.gamesPlayed === 0
      ? 0
      : progress.stats.gamesWon / progress.stats.gamesPlayed;

  const accuracy =
    progress.stats.totalCorrect + progress.stats.totalMistakes === 0
      ? 0
      : progress.stats.totalCorrect /
        (progress.stats.totalCorrect + progress.stats.totalMistakes);

  const avgTime =
    progress.stats.gamesWon === 0 ? null : progress.stats.totalTimeMs / progress.stats.gamesWon;

  const avgReaction =
    progress.stats.totalReactionSamples === 0
      ? null
      : progress.stats.totalReactionMs / progress.stats.totalReactionSamples;

  const score = focusScore(progress.sessions);

  // Last 20 winning runs → time trend (lower = better).
  const trendValues = useMemo(
    () =>
      progress.sessions
        .filter((s) => s.passed)
        .slice(-20)
        .map((s) => -s.timeMs), // invert so "up = better"
    [progress.sessions],
  );

  const cards: { label: string; value: string; accent?: boolean }[] = [
    { label: t("stats.games_played"), value: formatNumber(progress.stats.gamesPlayed) },
    { label: t("stats.games_won"), value: formatNumber(progress.stats.gamesWon) },
    { label: t("stats.win_rate"), value: formatPct(winRate) },
    { label: t("stats.accuracy"), value: formatPct(accuracy), accent: true },
    { label: t("stats.average_time"), value: formatTimeShort(avgTime) },
    {
      label: t("stats.average_reaction"),
      value: avgReaction == null ? "—" : `${Math.round(avgReaction)} ms`,
      accent: true,
    },
    { label: t("stats.longest_streak"), value: formatNumber(progress.stats.longestStreak) },
    { label: t("stats.current_streak"), value: formatNumber(progress.stats.currentStreak) },
    { label: t("stats.best_combo"), value: formatNumber(progress.stats.comboMax) },
    { label: t("stats.total_xp"), value: formatNumber(Math.floor(progress.xp)) },
    { label: t("stats.highest_level"), value: `${progress.highestUnlockedLevel} / ${TOTAL_LEVELS}` },
    { label: t("stats.daily_streak"), value: formatNumber(progress.daily.consecutiveDays) },
  ];

  return (
    <main className="w-full max-w-5xl mx-auto px-4 pb-6 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t("stats.title")}
        </h1>
        <p className="text-sm text-white/55 mt-1">
          {t(rank.nameKey as TranslationKey)} · {t("common.completed")} {completedLevels}/{TOTAL_LEVELS}
        </p>
      </header>

      <section className="glass rounded-3xl p-5 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="text-sm font-semibold text-white/85">
            {t("stats.performance")}
          </div>
          <div className="text-xs text-white/55">
            {t("stats.focus_score")}:{" "}
            <span className="text-accent-neon font-bold tabular-nums">{score}</span>
            <span className="text-white/40">/100</span>
          </div>
        </div>
        <XpBar xp={progress.xp} />
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-5">
          <div className="text-sm font-semibold text-white/80 mb-2">
            {t("stats.trend")}
          </div>
          {trendValues.length === 0 ? (
            <p className="text-xs text-white/45">{t("stats.empty")}</p>
          ) : (
            <SparkLine values={trendValues} />
          )}
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="text-sm font-semibold text-white/80 mb-2">
            {t("stats.heatmap")}
          </div>
          <Heatmap values={progress.mistakeHeatmap} />
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="glass rounded-2xl p-4 sm:p-5 hover:-translate-y-0.5 transition-transform"
          >
            <div className="text-[10px] uppercase tracking-widest text-white/45">
              {c.label}
            </div>
            <div
              className={[
                "mt-2 font-mono font-bold tabular-nums truncate",
                c.accent ? "text-accent-neon text-2xl" : "text-white text-2xl",
              ].join(" ")}
            >
              {c.value}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
