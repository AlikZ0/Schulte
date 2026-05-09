import { useProgress } from "../store/ProgressContext";
import { useSettings } from "../store/SettingsContext";
import type { TranslationKey } from "../i18n";

export function QuestsScreen() {
  const { progress } = useProgress();
  const { t } = useSettings();

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-5 has-bottom-nav animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("quest.title")}</h1>
        <p className="text-sm text-white/55 mt-1">{t("quest.subtitle")}</p>
      </header>

      {progress.quests.length === 0 ? (
        <div className="glass rounded-3xl p-6 text-center text-white/55">
          {t("quest.empty")}
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {progress.quests.map((q) => {
            const pct = Math.min(1, q.progress / q.goal);
            const name = t(q.kindKey as TranslationKey);
            return (
              <article
                key={q.id}
                className={[
                  "glass rounded-2xl p-4 flex items-center gap-3 transition-all",
                  q.completed
                    ? "border border-accent-success/40 shadow-[0_0_24px_rgba(34,197,94,0.18)]"
                    : "border border-white/10",
                ].join(" ")}
              >
                <div
                  className={[
                    "h-12 w-12 rounded-2xl grid place-items-center text-xl shadow-soft",
                    q.completed
                      ? "bg-gradient-to-br from-accent-success/40 to-accent-success/20 text-accent-success"
                      : "bg-gradient-to-br from-accent to-accent-glow text-white",
                  ].join(" ")}
                  aria-hidden
                >
                  {q.completed ? "✓" : "★"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{name}</div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-neon transition-all duration-300"
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-white/55 tabular-nums">
                    {q.progress}/{q.goal}
                    {q.rewardXp > 0 ? ` · +${q.rewardXp} XP` : ""}
                    {q.rewardSkillPoints > 0 ? ` · +${q.rewardSkillPoints} ★` : ""}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
