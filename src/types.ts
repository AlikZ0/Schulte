/* ──────────────────────────────────────────────────────────────────────────
   Core domain types
   ──────────────────────────────────────────────────────────────────────── */

export type Screen =
  | "menu"
  | "levels"
  | "game"
  | "stats"
  | "achievements"
  | "settings"
  | "profile"
  | "quests"
  | "leaderboard"
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
  | "connect4";

export type LevelTier = "easy" | "medium" | "hard" | "expert";

export type Modifier =
  | "HIDE_HINT"
  | "REVERSE"
  | "FADE"
  | "JITTER"
  | "BLINK"
  | "ROTATE"
  | "MEMORIZE"
  | "DISTRACTORS"
  | "TIME_PENALTY"
  | "LIMITED_LIVES"
  | "PARTIAL_INVIS"
  | "FAKE_NUMBERS"
  /**
   * After each correct tap, the freshly-found tile keeps showing its
   * shimmering number for a moment so the player can see where they
   * just were. Recently-tapped tiles fade out gradually, leaving a
   * "memory trail" across the board.
   */
  | "TRAIL";

export type GameMode =
  | "campaign"
  | "daily"
  | "zen"
  | "speedrun"
  | "nightmare"
  /** "Echo" — every level reveals a shimmering trail of recent presses. */
  | "trail";

export interface LevelConfig {
  level: number;
  tier: LevelTier;
  size: number;
  modifiers: Modifier[];
  lives: number;
  penaltyMs: number;
  memorizeMs: number;
  targetMs: number;
  baseXp: number;
}

export type GameStatus =
  | "idle"
  | "memorizing"
  | "running"
  | "completed"
  | "failed";

export interface RunResult {
  level: number;
  size: number;
  mode: GameMode;
  timeMs: number;
  mistakes: number;
  accuracy: number;
  xpEarned: number;
  stars: 0 | 1 | 2 | 3;
  comboMax: number;
  reactionAvgMs: number;
  isNewBest: boolean;
  passed: boolean;
  /** Indices on the board where mistakes happened (for heatmap analysis). */
  mistakeIndices: number[];
}

/* ──────────────────────────────────────────────────────────────────────────
   Progression / persistence
   ──────────────────────────────────────────────────────────────────────── */

export interface LevelRecord {
  bestTimeMs: number;
  bestAccuracy: number;
  stars: 0 | 1 | 2 | 3;
  attempts: number;
  completed: boolean;
}

export interface AggregateStats {
  gamesPlayed: number;
  gamesWon: number;
  totalTimeMs: number;
  totalMistakes: number;
  totalCorrect: number;
  totalReactionMs: number;
  totalReactionSamples: number;
  longestStreak: number;
  currentStreak: number;
  comboMax: number;
}

export interface DailyChallengeRecord {
  date: string;
  completed: boolean;
  bestTimeMs: number | null;
  consecutiveDays: number;
}

/** A single rolling-history entry for the trend sparkline. */
export interface SessionEntry {
  ts: number;
  mode: GameMode;
  level: number;
  timeMs: number;
  mistakes: number;
  passed: boolean;
}

/** Per-skill ranks (0..maxRank). Each adds passive bonuses. */
export interface SkillRanks {
  focus: number;
  memory: number;
  speed: number;
  accuracy: number;
}

/** Player profile basics (extensible). */
export interface PlayerProfile {
  name: string;
  avatarColor: string; // tailwind gradient key, see profile.ts
  createdAt: number;
}

export interface DailyLoginRecord {
  /** YYYY-MM-DD of the last claim. */
  lastClaimDate: string;
  /** Streak of consecutive days the reward was claimed. */
  streak: number;
  /** True if today's reward has been claimed. */
  claimedToday: boolean;
}

export interface Quest {
  id: string;
  /** ISO-week or ISO-date string this quest is bound to. */
  period: string;
  goal: number;
  progress: number;
  completed: boolean;
  rewardXp: number;
  rewardSkillPoints: number;
  /** Translation key fragment, see quests config. */
  kindKey: string;
}

export interface PrestigeData {
  prestiges: number;
  /** Multiplicative XP buff from prestige (e.g. 1.05^prestiges). */
  xpMultiplier: number;
}

export interface LeaderboardEntry {
  ts: number;
  level: number;
  mode: GameMode;
  timeMs: number;
  mistakes: number;
  /** Optional name for shareable contexts; defaults to local profile name. */
  name?: string;
}

/**
 * Per-mini-game persisted stats — total plays, wins and a single
 * "personal best" score whose semantic depends on the game (e.g. for
 * 2048 it's the in-game points; for Reaction it's `1000 - avgMs` so
 * higher is always better).
 */
export interface MinigameStat {
  plays: number;
  wins: number;
  bestScore: number;
}

export interface ProgressData {
  highestUnlockedLevel: number;
  xp: number;
  records: Record<number, LevelRecord>;
  stats: AggregateStats;
  unlockedAchievements: string[];
  daily: DailyChallengeRecord;
  /** Last 50 plays for trend charts. */
  sessions: SessionEntry[];
  /** 0..49 → mistake count at that board position. */
  mistakeHeatmap: number[];
  /** Skill tree allocations + total skill points earned. */
  skills: SkillRanks;
  skillPoints: number;
  /** Prestige bookkeeping. */
  prestige: PrestigeData;
  /** Daily-login chest. */
  login: DailyLoginRecord;
  /** Active rotating quests (max 3). */
  quests: Quest[];
  /** Local leaderboard entries (top 50). */
  leaderboard: LeaderboardEntry[];
  /** Player profile. */
  profile: PlayerProfile;
  /** Promo code ids that have already been redeemed (one-shot per device). */
  redeemedCodes: string[];
  /** Per-mini-game stats keyed by registry id (tictactoe / blackjack / ...). */
  minigames: Record<string, MinigameStat>;
  /** Schema version for future migrations. */
  v: number;
}

export type Language = "en" | "ru" | "es";

export type ThemeId = "aurora" | "sunset" | "mono" | "synthwave";

export type ColorblindMode = "off" | "deuteranopia" | "protanopia" | "tritanopia";

export type TextScale = "sm" | "md" | "lg" | "xl";

export interface SettingsData {
  sound: boolean;
  music: boolean;
  animations: boolean;
  difficultyAssist: boolean;
  haptics: boolean;
  voice: boolean;
  language: Language;
  theme: ThemeId;
  colorblind: ColorblindMode;
  dyslexiaFont: boolean;
  highContrast: boolean;
  textScale: TextScale;
  leftHanded: boolean;
  /* Mini-game visibility flags — toggleable from Settings → Mini-games. */
  showTicTacToe: boolean;
  showBlackjack: boolean;
  show2048: boolean;
  showMemory: boolean;
  showSudoku: boolean;
  showSlide: boolean;
  showMines: boolean;
  showLights: boolean;
  showMath: boolean;
  showSimon: boolean;
  showReaction: boolean;
  showConnect4: boolean;
  v: number;
}

/* ──────────────────────────────────────────────────────────────────────────
   Achievements
   ──────────────────────────────────────────────────────────────────────── */

export interface Achievement {
  id: string;
  titleKey: string;
  descriptionKey: string;
  test: (ctx: AchievementContext) => boolean;
  icon: string;
}

export interface AchievementContext {
  progress: ProgressData;
  lastResult: RunResult | null;
}

/* ──────────────────────────────────────────────────────────────────────────
   Ranks
   ──────────────────────────────────────────────────────────────────────── */

export interface Rank {
  nameKey: string;
  minXp: number;
  gradient: string;
  icon: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Theme system — ColorRecord matches CSS variable names in index.css.
   ──────────────────────────────────────────────────────────────────────── */

export interface Theme {
  id: ThemeId;
  /** Translation key for display name. */
  nameKey: string;
  /** Required prestige to unlock (0 = always unlocked). */
  unlockPrestige: number;
  /** Required highest level to unlock. */
  unlockLevel: number;
  /** CSS-variable map applied at the document root. */
  vars: Record<string, string>;
}
