import type { Modifier } from "../types";
import { useSettings } from "../store/SettingsContext";
import type { TranslationKey } from "../i18n";

interface ModifierBadgesProps {
  modifiers: Modifier[];
}

const ICONS: Record<Modifier, string> = {
  HIDE_HINT: "◌",
  REVERSE: "↓",
  FADE: "☁",
  JITTER: "≈",
  BLINK: "✺",
  ROTATE: "↻",
  MEMORIZE: "👁",
  DISTRACTORS: "✿",
  TIME_PENALTY: "⏱",
  LIMITED_LIVES: "♥",
  PARTIAL_INVIS: "○",
  FAKE_NUMBERS: "?",
  TRAIL: "✨",
};

export function ModifierBadges({ modifiers }: ModifierBadgesProps) {
  const { t } = useSettings();
  if (modifiers.length === 0) return null;

  // Dedupe in case of duplicates from the level generator.
  const uniq = Array.from(new Set(modifiers));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {uniq.map((m) => (
        <span
          key={m}
          className="chip text-[11px] py-0.5"
          title={t(`modifier.${m}` as TranslationKey)}
        >
          <span className="text-accent-neon">{ICONS[m]}</span>
          <span className="hidden sm:inline">
            {t(`modifier.${m}` as TranslationKey)}
          </span>
        </span>
      ))}
    </div>
  );
}
