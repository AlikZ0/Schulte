import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  ColorblindMode,
  Language,
  SettingsData,
  TextScale,
  ThemeId,
} from "../types";
import { loadPersisted, savePersisted } from "../utils/persistence";
import { translate, type TranslationKey } from "../i18n";
import { applyTheme } from "../features/themes/themesConfig";
import { applyAccessibility } from "../features/themes/accessibility";

const STORAGE_KEY = "stt:settings";
const COOKIE_KEY = "stt_settings";
const SCHEMA_VERSION = 4;

const DEFAULT_SETTINGS: SettingsData = {
  sound: true,
  music: false,
  animations: true,
  difficultyAssist: false,
  haptics: true,
  voice: false,
  language: "en",
  theme: "aurora",
  colorblind: "off",
  dyslexiaFont: false,
  highContrast: false,
  textScale: "md",
  leftHanded: false,
  showTicTacToe: true,
  showBlackjack: true,
  show2048: true,
  showMemory: true,
  showSudoku: true,
  showSlide: true,
  showMines: true,
  showLights: true,
  showMath: true,
  showSimon: true,
  showReaction: true,
  showConnect4: true,
  v: SCHEMA_VERSION,
};

function detectInitialLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("ru")) return "ru";
  if (lang.startsWith("es")) return "es";
  return "en";
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function validate(raw: unknown): SettingsData {
  const fallback: SettingsData = {
    ...DEFAULT_SETTINGS,
    language: detectInitialLanguage(),
  };
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Partial<SettingsData>;
  return {
    sound: typeof r.sound === "boolean" ? r.sound : fallback.sound,
    music: typeof r.music === "boolean" ? r.music : fallback.music,
    animations:
      typeof r.animations === "boolean" ? r.animations : fallback.animations,
    difficultyAssist:
      typeof r.difficultyAssist === "boolean"
        ? r.difficultyAssist
        : fallback.difficultyAssist,
    haptics: typeof r.haptics === "boolean" ? r.haptics : fallback.haptics,
    voice: typeof r.voice === "boolean" ? r.voice : fallback.voice,
    language: pick<Language>(r.language, ["en", "ru", "es"], fallback.language),
    theme: pick<ThemeId>(r.theme, ["aurora", "sunset", "synthwave", "mono"], fallback.theme),
    colorblind: pick<ColorblindMode>(
      r.colorblind,
      ["off", "deuteranopia", "protanopia", "tritanopia"],
      fallback.colorblind,
    ),
    dyslexiaFont: typeof r.dyslexiaFont === "boolean" ? r.dyslexiaFont : false,
    highContrast: typeof r.highContrast === "boolean" ? r.highContrast : false,
    textScale: pick<TextScale>(r.textScale, ["sm", "md", "lg", "xl"], "md"),
    leftHanded: typeof r.leftHanded === "boolean" ? r.leftHanded : false,
    showTicTacToe:
      typeof r.showTicTacToe === "boolean" ? r.showTicTacToe : true,
    showBlackjack:
      typeof r.showBlackjack === "boolean" ? r.showBlackjack : true,
    show2048: typeof r.show2048 === "boolean" ? r.show2048 : true,
    showMemory: typeof r.showMemory === "boolean" ? r.showMemory : true,
    showSudoku: typeof r.showSudoku === "boolean" ? r.showSudoku : true,
    showSlide: typeof r.showSlide === "boolean" ? r.showSlide : true,
    showMines: typeof r.showMines === "boolean" ? r.showMines : true,
    showLights: typeof r.showLights === "boolean" ? r.showLights : true,
    showMath: typeof r.showMath === "boolean" ? r.showMath : true,
    showSimon: typeof r.showSimon === "boolean" ? r.showSimon : true,
    showReaction: typeof r.showReaction === "boolean" ? r.showReaction : true,
    showConnect4: typeof r.showConnect4 === "boolean" ? r.showConnect4 : true,
    v: SCHEMA_VERSION,
  };
}

interface SettingsContextValue {
  settings: SettingsData;
  setSettings: (partial: Partial<SettingsData>) => void;
  replaceSettings: (next: SettingsData) => void;
  t: (key: TranslationKey) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setState] = useState<SettingsData>(() =>
    loadPersisted<SettingsData>({
      key: STORAGE_KEY,
      cookieKey: COOKIE_KEY,
      version: SCHEMA_VERSION,
      validate,
    }),
  );

  // Persist on change.
  useEffect(() => {
    savePersisted({
      key: STORAGE_KEY,
      cookieKey: COOKIE_KEY,
      version: SCHEMA_VERSION,
      value: settings,
    });
  }, [settings]);

  // Apply theme + accessibility variables.
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    applyAccessibility({
      colorblind: settings.colorblind,
      dyslexiaFont: settings.dyslexiaFont,
      highContrast: settings.highContrast,
      textScale: settings.textScale,
      leftHanded: settings.leftHanded,
      animations: settings.animations,
    });
  }, [
    settings.colorblind,
    settings.dyslexiaFont,
    settings.highContrast,
    settings.textScale,
    settings.leftHanded,
    settings.animations,
  ]);

  const setSettings = useCallback((partial: Partial<SettingsData>) => {
    setState((prev) => ({ ...prev, ...partial, v: SCHEMA_VERSION }));
  }, []);

  const replaceSettings = useCallback((next: SettingsData) => {
    setState({ ...next, v: SCHEMA_VERSION });
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translate(settings.language, key),
    [settings.language],
  );

  const value = useMemo(
    () => ({ settings, setSettings, replaceSettings, t }),
    [settings, setSettings, replaceSettings, t],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
