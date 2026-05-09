import { rankFor } from "../utils/ranks";
import { useSettings } from "../store/SettingsContext";
import { formatNumber } from "../utils/formatTime";
import type { TranslationKey } from "../i18n";

interface XpBarProps {
  xp: number;
  showLabels?: boolean;
}

export function XpBar({ xp, showLabels = true }: XpBarProps) {
  const { t } = useSettings();
  const { rank, next, progress } = rankFor(xp);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white/85">
            {t(rank.nameKey as TranslationKey)}
          </span>
          <span className="font-mono text-white/55 tabular-nums">
            {formatNumber(Math.floor(xp))}
            {next ? ` / ${formatNumber(next.minXp)} XP` : " XP"}
          </span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={[
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
            rank.gradient,
          ].join(" ")}
          style={{ width: `${Math.max(2, progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
