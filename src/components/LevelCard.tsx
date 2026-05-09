import type { LevelConfig, LevelRecord } from "../types";
import { useSettings } from "../store/SettingsContext";
import { formatTimeShort } from "../utils/formatTime";
import { Stars } from "./Stars";
import type { TranslationKey } from "../i18n";

interface LevelCardProps {
  config: LevelConfig;
  unlocked: boolean;
  record?: LevelRecord;
  onClick: () => void;
}

const TIER_COLORS: Record<LevelConfig["tier"], string> = {
  easy: "from-emerald-400/40 to-teal-500/10",
  medium: "from-sky-400/40 to-cyan-500/10",
  hard: "from-violet-400/40 to-fuchsia-500/10",
  expert: "from-rose-400/50 to-amber-500/10",
};

const TIER_RING: Record<LevelConfig["tier"], string> = {
  easy: "ring-emerald-400/30",
  medium: "ring-sky-400/30",
  hard: "ring-violet-400/30",
  expert: "ring-rose-400/40",
};

export function LevelCard({ config, unlocked, record, onClick }: LevelCardProps) {
  const { t } = useSettings();
  const completed = record?.completed;
  const stars = (record?.stars ?? 0) as 0 | 1 | 2 | 3;

  const tierLabel = t(`tier.${config.tier}` as TranslationKey);

  const baseStyles = [
    "group relative flex flex-col items-center justify-center gap-1.5",
    "aspect-square rounded-2xl p-2 sm:p-3 transition-all duration-200",
    "border border-white/10",
    unlocked
      ? "glass hover:-translate-y-1 hover:shadow-soft active:scale-[0.97]"
      : "bg-white/[0.025] border-white/5 cursor-not-allowed",
  ].join(" ");

  return (
    <button
      type="button"
      onClick={unlocked ? onClick : undefined}
      disabled={!unlocked}
      aria-label={`${t("levels.level")} ${config.level}`}
      className={baseStyles}
    >
      {/* Tier-tinted backdrop glow when unlocked */}
      {unlocked && (
        <div
          className={[
            "absolute inset-0 rounded-2xl opacity-50 group-hover:opacity-80 transition-opacity",
            "bg-gradient-to-br",
            TIER_COLORS[config.tier],
            "ring-1",
            TIER_RING[config.tier],
            "pointer-events-none",
          ].join(" ")}
          aria-hidden
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-1">
        {!unlocked ? (
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/30"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/55">
            {tierLabel}
          </span>
        )}
        <span
          className={[
            "font-extrabold tabular-nums",
            unlocked ? "text-2xl sm:text-3xl" : "text-xl text-white/35",
          ].join(" ")}
        >
          {config.level}
        </span>
        {unlocked && completed && <Stars count={stars} size="sm" />}
        {unlocked && !completed && (
          <span className="text-[10px] text-white/45">
            {config.size}×{config.size}
          </span>
        )}
        {unlocked && record?.bestTimeMs ? (
          <span className="text-[10px] font-mono text-white/55 tabular-nums">
            {formatTimeShort(record.bestTimeMs)}
          </span>
        ) : null}
      </div>
    </button>
  );
}
