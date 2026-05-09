import { useMemo, useState } from "react";
import { useProgress } from "../store/ProgressContext";
import { useSettings } from "../store/SettingsContext";
import { formatTime } from "../utils/formatTime";
import { MODES } from "../features/modes/modes";
import type { GameMode } from "../types";
import type { TranslationKey } from "../i18n";

export function LeaderboardScreen() {
  const { progress } = useProgress();
  const { t } = useSettings();
  const [filterMode, setFilterMode] = useState<GameMode | "all">("all");

  const entries = useMemo(() => {
    const all =
      filterMode === "all"
        ? progress.leaderboard
        : progress.leaderboard.filter((e) => e.mode === filterMode);
    return all.slice(0, 25);
  }, [progress.leaderboard, filterMode]);

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-5 has-bottom-nav animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("leaderboard.title")}</h1>
        <p className="text-sm text-white/55 mt-1">{t("leaderboard.subtitle")}</p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...MODES.map((m) => m.id)] as const).map((m) => {
          const active = filterMode === m;
          const label = m === "all" ? "All" : t(MODES.find((x) => x.id === m)!.nameKey as TranslationKey);
          return (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMode(m as GameMode | "all")}
              className={[
                "h-8 px-3 rounded-full text-xs font-semibold transition-all",
                active
                  ? "bg-gradient-to-br from-accent to-accent-glow text-white shadow-soft"
                  : "glass text-white/70 hover:text-white",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <div className="glass rounded-3xl p-6 text-center text-white/55">
          {t("leaderboard.empty")}
        </div>
      ) : (
        <section className="glass rounded-3xl overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-widest text-white/45 border-b border-white/5">
            <div className="col-span-1">#</div>
            <div className="col-span-3">{t("leaderboard.level")}</div>
            <div className="col-span-3">{t("leaderboard.mode")}</div>
            <div className="col-span-3">{t("leaderboard.time")}</div>
            <div className="col-span-2 text-right">{t("leaderboard.date")}</div>
          </div>
          {entries.map((e, i) => {
            const modeMeta = MODES.find((m) => m.id === e.mode);
            return (
              <div
                key={`${e.ts}-${i}`}
                className="grid grid-cols-12 px-4 py-2 items-center hover:bg-white/[0.04] transition-colors"
              >
                <div className="col-span-1 font-bold tabular-nums">{i + 1}</div>
                <div className="col-span-3 font-mono tabular-nums">{e.level}</div>
                <div className="col-span-3 text-sm">
                  <span className="mr-1">{modeMeta?.icon}</span>
                  {modeMeta ? t(modeMeta.nameKey as TranslationKey) : e.mode}
                </div>
                <div className="col-span-3 font-mono font-bold text-accent-neon tabular-nums">
                  {formatTime(e.timeMs)}
                </div>
                <div className="col-span-2 text-right text-xs text-white/55">
                  {new Date(e.ts).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
