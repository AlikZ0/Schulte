import { useMemo } from "react";
import { useProgress } from "../store/ProgressContext";
import { useSettings } from "../store/SettingsContext";
import { allLevelConfigs } from "../utils/levels";
import { LevelCard } from "../components/LevelCard";
import type { GameMode, LevelConfig, LevelTier } from "../types";
import type { TranslationKey } from "../i18n";

interface LevelSelectProps {
  onSelect: (level: number, mode: GameMode) => void;
}

const TIER_GRADIENTS: Record<LevelTier, string> = {
  easy: "from-emerald-400 to-teal-500",
  medium: "from-sky-400 to-cyan-500",
  hard: "from-violet-400 to-fuchsia-500",
  expert: "from-rose-400 to-amber-500",
};

export function LevelSelect({ onSelect }: LevelSelectProps) {
  const { progress, isUnlocked } = useProgress();
  const { t } = useSettings();
  const all = useMemo(() => allLevelConfigs(), []);

  const grouped = useMemo(() => {
    const map: Record<LevelTier, LevelConfig[]> = {
      easy: [], medium: [], hard: [], expert: [],
    };
    for (const cfg of all) map[cfg.tier].push(cfg);
    return map;
  }, [all]);

  const tiers: LevelTier[] = ["easy", "medium", "hard", "expert"];

  return (
    <main
      className="w-full max-w-6xl mx-auto px-4 py-5 sm:py-8 flex flex-col gap-5 has-bottom-nav animate-fade-in"
      style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
    >
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("levels.title")}
          </h1>
          <p className="text-sm text-white/55 mt-1">{t("levels.subtitle")}</p>
        </div>
        <div className="chip">
          {t("common.unlocked")}:{" "}
          <span className="text-white font-semibold ml-1 tabular-nums">
            {progress.highestUnlockedLevel} / {all.length}
          </span>
        </div>
      </header>

      {tiers.map((tier) => (
        <section key={tier} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span
              className={[
                "h-6 px-3 rounded-full text-xs font-bold grid place-items-center",
                "bg-gradient-to-r text-bg shadow-soft",
                TIER_GRADIENTS[tier],
              ].join(" ")}
            >
              {t(`tier.${tier}` as TranslationKey)}
            </span>
            <span className="text-xs text-white/45 tabular-nums">
              {grouped[tier][0].level}–{grouped[tier][grouped[tier].length - 1].level}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
            {grouped[tier].map((cfg) => (
              <LevelCard
                key={cfg.level}
                config={cfg}
                unlocked={isUnlocked(cfg.level)}
                record={progress.records[cfg.level]}
                onClick={() => onSelect(cfg.level, "campaign")}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
