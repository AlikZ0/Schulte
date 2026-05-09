import type { Theme, ThemeId } from "../../types";

/**
 * CSS-variable based theme system. The keys map 1:1 to the variables
 * declared in index.css, and Tailwind's color tokens reference them.
 */
export const THEMES: Record<ThemeId, Theme> = {
  aurora: {
    id: "aurora",
    nameKey: "theme.aurora",
    unlockPrestige: 0,
    unlockLevel: 0,
    vars: {
      "--bg":          "#0a0a0f",
      "--bg-soft":     "#11121a",
      "--bg-card":     "#161724",
      "--accent":      "#7c5cff",
      "--accent-glow": "#a78bfa",
      "--accent-neon": "#22d3ee",
      "--success":     "#22c55e",
      "--danger":      "#ef4444",
      "--bg-grad-1":   "rgba(124, 92, 255, 0.18)",
      "--bg-grad-2":   "rgba(34, 211, 238, 0.12)",
    },
  },
  sunset: {
    id: "sunset",
    nameKey: "theme.sunset",
    unlockPrestige: 0,
    unlockLevel: 25,
    vars: {
      "--bg":          "#0f0a0f",
      "--bg-soft":     "#1a1118",
      "--bg-card":     "#241620",
      "--accent":      "#fb923c",
      "--accent-glow": "#f472b6",
      "--accent-neon": "#fbbf24",
      "--success":     "#84cc16",
      "--danger":      "#f43f5e",
      "--bg-grad-1":   "rgba(251, 146, 60, 0.20)",
      "--bg-grad-2":   "rgba(244, 114, 182, 0.16)",
    },
  },
  synthwave: {
    id: "synthwave",
    nameKey: "theme.synthwave",
    unlockPrestige: 0,
    unlockLevel: 50,
    vars: {
      "--bg":          "#0a071a",
      "--bg-soft":     "#120c2b",
      "--bg-card":     "#1a1238",
      "--accent":      "#ec4899",
      "--accent-glow": "#a78bfa",
      "--accent-neon": "#22d3ee",
      "--success":     "#34d399",
      "--danger":      "#fb7185",
      "--bg-grad-1":   "rgba(236, 72, 153, 0.18)",
      "--bg-grad-2":   "rgba(34, 211, 238, 0.15)",
    },
  },
  mono: {
    id: "mono",
    nameKey: "theme.mono",
    unlockPrestige: 1,
    unlockLevel: 0,
    vars: {
      "--bg":          "#0a0a0a",
      "--bg-soft":     "#141414",
      "--bg-card":     "#1c1c1c",
      "--accent":      "#e4e4e7",
      "--accent-glow": "#d4d4d8",
      "--accent-neon": "#a1a1aa",
      "--success":     "#a1a1aa",
      "--danger":      "#fca5a5",
      "--bg-grad-1":   "rgba(228, 228, 231, 0.08)",
      "--bg-grad-2":   "rgba(228, 228, 231, 0.04)",
    },
  },
};

export const THEME_LIST: Theme[] = Object.values(THEMES);

export function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const theme = THEMES[id] ?? THEMES.aurora;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v);
  }
  root.dataset.theme = theme.id;
}

export function isThemeUnlocked(
  id: ThemeId,
  highestLevel: number,
  prestiges: number,
): boolean {
  const theme = THEMES[id];
  if (!theme) return false;
  if (theme.unlockPrestige > prestiges) return false;
  if (theme.unlockLevel > highestLevel) return false;
  return true;
}
