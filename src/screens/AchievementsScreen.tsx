import { useProgress } from "../store/ProgressContext";
import { useSettings } from "../store/SettingsContext";
import { ACHIEVEMENTS } from "../utils/achievements";
import type { TranslationKey } from "../i18n";

export function AchievementsScreen() {
  const { progress } = useProgress();
  const { t } = useSettings();
  const unlocked = new Set(progress.unlockedAchievements);

  return (
    <main className="w-full max-w-5xl mx-auto px-4 pb-6 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t("ach.title")}
        </h1>
        <p className="text-sm text-white/55 mt-1">
          {t("ach.subtitle")} · {t("ach.unlocked_count")}: {unlocked.size}/{ACHIEVEMENTS.length}
        </p>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.has(a.id);
          return (
            <article
              key={a.id}
              className={[
                "glass rounded-2xl p-4 sm:p-5 flex items-start gap-3 transition-all",
                got
                  ? "shadow-glow border border-accent/40"
                  : "opacity-60 grayscale-[0.5]",
              ].join(" ")}
            >
              <div
                className={[
                  "h-12 w-12 rounded-2xl grid place-items-center text-2xl shadow-soft",
                  got
                    ? "bg-gradient-to-br from-accent to-accent-neon"
                    : "bg-white/5",
                ].join(" ")}
                aria-hidden
              >
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  <span className="truncate">
                    {t(a.titleKey as TranslationKey)}
                  </span>
                  {got && (
                    <span className="text-[10px] uppercase tracking-widest text-accent-neon">
                      {t("common.unlocked")}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  {t(a.descriptionKey as TranslationKey)}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
