import { rankFor } from "../utils/ranks";
import { useSettings } from "../store/SettingsContext";

interface RankBadgeProps {
  xp: number;
  size?: "sm" | "md" | "lg";
}

export function RankBadge({ xp, size = "md" }: RankBadgeProps) {
  const { t } = useSettings();
  const { rank } = rankFor(xp);

  const dimensions = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-14 w-14 text-xl",
  }[size];

  return (
    <div
      className={[
        "rounded-2xl grid place-items-center font-bold text-bg shadow-glow",
        "bg-gradient-to-br",
        rank.gradient,
        dimensions,
      ].join(" ")}
      title={t(rank.nameKey as Parameters<typeof t>[0])}
      aria-label={t(rank.nameKey as Parameters<typeof t>[0])}
    >
      <span aria-hidden>{rank.icon}</span>
    </div>
  );
}
