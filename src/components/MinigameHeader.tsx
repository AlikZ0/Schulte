import { useSettings } from "../store/SettingsContext";

interface MinigameHeaderProps {
  title: string;
  subtitle?: string;
  onExit: () => void;
}

/**
 * Standard header used by every mini-game screen — back button, title,
 * subtitle. Keeps each game file focused on its own logic + visuals.
 */
export function MinigameHeader({ title, subtitle, onExit }: MinigameHeaderProps) {
  const { t } = useSettings();
  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        onClick={onExit}
        className="btn-ghost h-10 px-3 rounded-2xl"
        aria-label={t("common.back")}
      >
        ←
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-white/55 mt-0.5">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
