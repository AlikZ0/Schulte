import type { ColorblindMode, TextScale } from "../../types";

/**
 * Apply accessibility-related document classes / attributes. Driven by the
 * SettingsContext so toggling is immediate and works alongside themes.
 */
export function applyAccessibility(opts: {
  colorblind: ColorblindMode;
  dyslexiaFont: boolean;
  highContrast: boolean;
  textScale: TextScale;
  leftHanded: boolean;
  animations: boolean;
}): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.cb = opts.colorblind;
  root.dataset.font = opts.dyslexiaFont ? "dyslexic" : "default";
  root.dataset.contrast = opts.highContrast ? "high" : "normal";
  root.dataset.scale = opts.textScale;
  root.dataset.handed = opts.leftHanded ? "left" : "right";
  if (opts.animations) root.classList.remove("reduce-motion");
  else root.classList.add("reduce-motion");
}

export const TEXT_SCALES: Record<TextScale, string> = {
  sm: "0.92",
  md: "1.00",
  lg: "1.10",
  xl: "1.22",
};

export const COLORBLIND_LABELS: Record<ColorblindMode, string> = {
  off: "Off",
  deuteranopia: "Deuteranopia",
  protanopia: "Protanopia",
  tritanopia: "Tritanopia",
};

export const TEXT_SCALE_LABELS: Record<TextScale, string> = {
  sm: "Small",
  md: "Default",
  lg: "Large",
  xl: "Extra large",
};
