import type { GameMode, Screen } from "../types";
import { useProgress } from "../store/ProgressContext";
import { useSettings } from "../store/SettingsContext";
import { rankFor } from "../utils/ranks";
import { TOTAL_LEVELS } from "../utils/levels";
import { recommendLevel, focusScore } from "../utils/dynamicDifficulty";
import { MODES, isModeUnlocked } from "../features/modes/modes";
import { gradientById, initialsFor } from "../features/profile/avatars";
import { XpBar } from "../components/XpBar";
import { formatTimeShort } from "../utils/formatTime";
import type { TranslationKey } from "../i18n";

interface MainMenuProps {
  onNavigate: (screen: Screen) => void;
  onPlay: (level: number, mode: GameMode) => void;
}

export function MainMenu({ onNavigate, onPlay }: MainMenuProps) {
  const { progress } = useProgress();
  const { t } = useSettings();
  const { rank } = rankFor(progress.xp);

  const continueLevel = Math.min(progress.highestUnlockedLevel, TOTAL_LEVELS);
  const recommended = recommendLevel(progress.sessions, progress.highestUnlockedLevel);
  const score = focusScore(progress.sessions);

  return (
    <main className="w-full max-w-3xl mx-auto px-4 pb-5 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      {/* Hero card */}
      <section className="glass rounded-3xl p-5 sm:p-7 shadow-soft">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className={[
              "h-14 w-14 rounded-2xl shadow-glow grid place-items-center text-bg font-extrabold text-xl",
              "bg-gradient-to-br active:scale-95 transition-transform",
              gradientById(progress.profile.avatarColor),
            ].join(" ")}
            aria-label={t("menu.profile")}
          >
            {initialsFor(progress.profile.name)}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                {progress.profile.name}
              </h1>
              <span className="chip text-[10px]">
                {t(rank.nameKey as TranslationKey)}
              </span>
            </div>
            <div className="mt-2"><XpBar xp={progress.xp} showLabels={false} /></div>
            <div className="mt-1.5 text-xs text-white/55 flex items-center gap-2">
              <span>Lvl {progress.highestUnlockedLevel} / {TOTAL_LEVELS}</span>
              <span>·</span>
              <span>{t("stats.focus_score")} <span className="font-mono text-white/85">{score}</span></span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onPlay(continueLevel, "campaign")}
            className="btn-primary w-full text-base h-12"
          >
            ▶ {t("menu.play")} · {t("levels.level")} {continueLevel}
          </button>
          {recommended !== continueLevel && (
            <button
              type="button"
              onClick={() => onPlay(recommended, "campaign")}
              className="btn-ghost w-full h-11"
            >
              {t("menu.recommended")}: {t("levels.level")} {recommended}
            </button>
          )}
        </div>
      </section>

      {/* Game modes carousel */}
      <section>
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-sm font-semibold text-white/85">{t("menu.modes")}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2 snap-x snap-mandatory">
          {MODES.map((m) => {
            const unlocked = isModeUnlocked(m.id, progress.highestUnlockedLevel);
            return (
              <button
                key={m.id}
                type="button"
                disabled={!unlocked}
                onClick={() =>
                  onPlay(
                    m.id === "daily" ? 1 : Math.min(progress.highestUnlockedLevel, TOTAL_LEVELS),
                    m.id,
                  )
                }
                className={[
                  "shrink-0 w-44 snap-start glass rounded-2xl p-4 text-left transition-all",
                  unlocked
                    ? "hover:-translate-y-0.5 hover:shadow-glow"
                    : "opacity-50 cursor-not-allowed",
                ].join(" ")}
              >
                <div className="text-2xl">{m.icon}</div>
                <div className="mt-1 font-bold">{t(m.nameKey as TranslationKey)}</div>
                <div className="text-xs text-white/55 mt-1 line-clamp-2">
                  {t(m.descriptionKey as TranslationKey)}
                </div>
                {!unlocked && (
                  <div className="text-[11px] text-white/45 mt-1">
                    {t("common.locked")} · Lvl {m.unlockLevel}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Daily / Quests / Leaderboard / Tic-Tac-Toe quick cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onPlay(1, "daily")}
          className="glass rounded-2xl p-4 text-left hover:-translate-y-0.5 hover:shadow-glow transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-bg font-bold shadow-soft">
              ☀
            </div>
            <div className="flex-1">
              <div className="font-bold">{t("daily.title")}</div>
              <div className="text-xs text-white/55">
                {progress.daily.completed
                  ? t("daily.completed")
                  : `${t("daily.streak")}: ${progress.daily.consecutiveDays}`}
              </div>
            </div>
          </div>
          {progress.daily.bestTimeMs != null && (
            <div className="mt-2 text-xs text-white/55">
              {t("levels.best")}{" "}
              <span className="font-mono text-white/80">{formatTimeShort(progress.daily.bestTimeMs)}</span>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate("quests")}
          className="glass rounded-2xl p-4 text-left hover:-translate-y-0.5 hover:shadow-glow transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 grid place-items-center text-bg font-bold shadow-soft">
              ★
            </div>
            <div className="flex-1">
              <div className="font-bold">{t("menu.quests")}</div>
              <div className="text-xs text-white/55">
                {progress.quests.filter((q) => q.completed).length}/
                {progress.quests.length || 0}
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("leaderboard")}
          className="glass rounded-2xl p-4 text-left hover:-translate-y-0.5 hover:shadow-glow transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 grid place-items-center text-bg font-bold shadow-soft">
              🏆
            </div>
            <div className="flex-1">
              <div className="font-bold">{t("menu.leaderboard")}</div>
              <div className="text-xs text-white/55">
                {progress.leaderboard.length} runs
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("tictactoe")}
          className="glass rounded-2xl p-4 text-left hover:-translate-y-0.5 hover:shadow-glow transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-400 to-pink-500 grid place-items-center text-bg font-bold shadow-soft">
              ✕
            </div>
            <div className="flex-1">
              <div className="font-bold">{t("menu.tictactoe")}</div>
              <div className="text-xs text-white/55">
                {t("tictactoe.subtitle")}
              </div>
            </div>
          </div>
        </button>
      </section>

      <p className="text-xs text-white/45 text-center">{t("menu.tagline")}</p>
    </main>
  );
}
