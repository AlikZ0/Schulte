import type { Screen, SettingsData } from "../../types";

/**
 * Single source of truth for every mini-game in the app.
 *
 * Both the main menu cards and the settings toggles iterate this list, so
 * adding a new game is a one-line registry change + a screen file. The
 * `settingKey` field is type-safe: only boolean fields on SettingsData
 * are accepted.
 */
export interface MinigameMeta {
  /** Internal id, also the routed Screen value. */
  id: Extract<
    Screen,
    | "tictactoe"
    | "blackjack"
    | "g2048"
    | "memory"
    | "sudoku"
    | "slide"
    | "mines"
    | "lights"
    | "math"
    | "simon"
    | "reaction"
    | "connect4"
  >;
  /** i18n key for the human name. */
  nameKey: string;
  /** i18n key for the short tagline shown on the menu card. */
  subtitleKey: string;
  /** Emoji or short glyph rendered in the menu card icon bubble. */
  icon: string;
  /** Tailwind gradient classes for the icon bubble. */
  gradient: string;
  /** SettingsData boolean key controlling menu visibility. */
  settingKey: BooleanSettingKey;
}

type BooleanSettingKey = {
  [K in keyof SettingsData]: SettingsData[K] extends boolean ? K : never;
}[keyof SettingsData];

export const MINIGAMES: MinigameMeta[] = [
  {
    id: "tictactoe",
    nameKey: "menu.tictactoe",
    subtitleKey: "tictactoe.subtitle",
    icon: "✕",
    gradient: "from-fuchsia-400 to-pink-500",
    settingKey: "showTicTacToe",
  },
  {
    id: "blackjack",
    nameKey: "menu.blackjack",
    subtitleKey: "blackjack.subtitle",
    icon: "♠",
    gradient: "from-emerald-400 to-teal-500",
    settingKey: "showBlackjack",
  },
  {
    id: "g2048",
    nameKey: "menu.g2048",
    subtitleKey: "g2048.subtitle",
    icon: "2048",
    gradient: "from-amber-400 to-orange-500",
    settingKey: "show2048",
  },
  {
    id: "memory",
    nameKey: "menu.memory",
    subtitleKey: "memory.subtitle",
    icon: "🧠",
    gradient: "from-violet-400 to-fuchsia-500",
    settingKey: "showMemory",
  },
  {
    id: "sudoku",
    nameKey: "menu.sudoku",
    subtitleKey: "sudoku.subtitle",
    icon: "▦",
    gradient: "from-sky-400 to-cyan-500",
    settingKey: "showSudoku",
  },
  {
    id: "slide",
    nameKey: "menu.slide",
    subtitleKey: "slide.subtitle",
    icon: "▤",
    gradient: "from-indigo-400 to-violet-500",
    settingKey: "showSlide",
  },
  {
    id: "mines",
    nameKey: "menu.mines",
    subtitleKey: "mines.subtitle",
    icon: "✸",
    gradient: "from-rose-400 to-amber-500",
    settingKey: "showMines",
  },
  {
    id: "lights",
    nameKey: "menu.lights",
    subtitleKey: "lights.subtitle",
    icon: "✦",
    gradient: "from-yellow-300 to-amber-500",
    settingKey: "showLights",
  },
  {
    id: "math",
    nameKey: "menu.math",
    subtitleKey: "math.subtitle",
    icon: "∑",
    gradient: "from-cyan-300 to-sky-500",
    settingKey: "showMath",
  },
  {
    id: "simon",
    nameKey: "menu.simon",
    subtitleKey: "simon.subtitle",
    icon: "◓",
    gradient: "from-lime-400 to-emerald-500",
    settingKey: "showSimon",
  },
  {
    id: "reaction",
    nameKey: "menu.reaction",
    subtitleKey: "reaction.subtitle",
    icon: "⚡",
    gradient: "from-amber-400 via-fuchsia-400 to-pink-500",
    settingKey: "showReaction",
  },
  {
    id: "connect4",
    nameKey: "menu.connect4",
    subtitleKey: "connect4.subtitle",
    icon: "●",
    gradient: "from-rose-500 to-amber-400",
    settingKey: "showConnect4",
  },
];
