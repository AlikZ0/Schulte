import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  AggregateStats,
  DailyChallengeRecord,
  DailyLoginRecord,
  LeaderboardEntry,
  LevelRecord,
  MinigameStat,
  PlayerProfile,
  PrestigeData,
  ProgressData,
  Quest,
  RunResult,
  SessionEntry,
  SkillRanks,
} from "../types";
import { loadPersisted, savePersisted } from "../utils/persistence";
import { TOTAL_LEVELS } from "../utils/levels";
import { ACHIEVEMENTS, findNewlyUnlocked } from "../utils/achievements";
import { todayKey } from "../utils/seedRandom";
import { rollDailyQuests } from "../features/quests/questsConfig";
import { reduceQuestsAfterRun } from "../features/quests/questEngine";
import { AVATAR_OPTIONS } from "../features/profile/avatars";
import { totalAllocated } from "../features/skills/skillsConfig";
import {
  lookupPromoCode,
  PROMO_CODES,
  type PromoCode,
} from "../features/promo/promoCodes";

const STORAGE_KEY = "stt:progress";
const COOKIE_KEY = "stt_progress";
const SCHEMA_VERSION = 4;

const HEATMAP_LEN = 49; // max board size we model

const EMPTY_STATS: AggregateStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalTimeMs: 0,
  totalMistakes: 0,
  totalCorrect: 0,
  totalReactionMs: 0,
  totalReactionSamples: 0,
  longestStreak: 0,
  currentStreak: 0,
  comboMax: 0,
};

const EMPTY_DAILY: DailyChallengeRecord = {
  date: "",
  completed: false,
  bestTimeMs: null,
  consecutiveDays: 0,
};

const EMPTY_LOGIN: DailyLoginRecord = {
  lastClaimDate: "",
  streak: 0,
  claimedToday: false,
};

const EMPTY_PRESTIGE: PrestigeData = {
  prestiges: 0,
  xpMultiplier: 1,
};

const EMPTY_SKILLS: SkillRanks = { focus: 0, memory: 0, speed: 0, accuracy: 0 };

function defaultProfile(): PlayerProfile {
  return {
    name: "Player",
    avatarColor: AVATAR_OPTIONS[0].id,
    createdAt: Date.now(),
  };
}

const DEFAULT_PROGRESS: ProgressData = {
  highestUnlockedLevel: 1,
  xp: 0,
  records: {},
  stats: EMPTY_STATS,
  unlockedAchievements: [],
  daily: EMPTY_DAILY,
  sessions: [],
  mistakeHeatmap: new Array(HEATMAP_LEN).fill(0),
  skills: EMPTY_SKILLS,
  skillPoints: 0,
  prestige: EMPTY_PRESTIGE,
  login: EMPTY_LOGIN,
  quests: [],
  leaderboard: [],
  profile: defaultProfile(),
  redeemedCodes: [],
  minigames: {},
  v: SCHEMA_VERSION,
};

/** Game ids that are allowed to write minigame stats. */
const MINIGAME_IDS: readonly string[] = [
  "tictactoe",
  "blackjack",
  "g2048",
  "memory",
  "sudoku",
  "slide",
  "mines",
  "lights",
  "math",
  "simon",
  "reaction",
  "connect4",
];

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function clampNumber(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function validate(raw: unknown): ProgressData {
  if (!raw || typeof raw !== "object") return cloneDefault();
  const r = raw as Partial<ProgressData>;

  // Records
  const records: Record<number, LevelRecord> = {};
  if (r.records && typeof r.records === "object") {
    for (const [k, v] of Object.entries(r.records)) {
      const lvl = parseInt(k, 10);
      if (!Number.isFinite(lvl) || lvl < 1 || lvl > TOTAL_LEVELS) continue;
      const rec = v as Partial<LevelRecord>;
      records[lvl] = {
        bestTimeMs: clampNumber(rec.bestTimeMs, 0, 1e7, 0),
        bestAccuracy: clampNumber(rec.bestAccuracy, 0, 1, 0),
        stars: clampInt(rec.stars, 0, 3, 0) as 0 | 1 | 2 | 3,
        attempts: clampInt(rec.attempts, 0, 1e6, 0),
        completed: !!rec.completed,
      };
    }
  }

  const s = (r.stats ?? {}) as Partial<AggregateStats>;
  const stats: AggregateStats = {
    gamesPlayed: clampInt(s.gamesPlayed, 0, 1e9, 0),
    gamesWon: clampInt(s.gamesWon, 0, 1e9, 0),
    totalTimeMs: clampNumber(s.totalTimeMs, 0, 1e12, 0),
    totalMistakes: clampInt(s.totalMistakes, 0, 1e9, 0),
    totalCorrect: clampInt(s.totalCorrect, 0, 1e9, 0),
    totalReactionMs: clampNumber(s.totalReactionMs, 0, 1e12, 0),
    totalReactionSamples: clampInt(s.totalReactionSamples, 0, 1e9, 0),
    longestStreak: clampInt(s.longestStreak, 0, 1e6, 0),
    currentStreak: clampInt(s.currentStreak, 0, 1e6, 0),
    comboMax: clampInt(s.comboMax, 0, 1e6, 0),
  };

  const d = (r.daily ?? {}) as Partial<DailyChallengeRecord>;
  const daily: DailyChallengeRecord = {
    date: typeof d.date === "string" ? d.date : "",
    completed: !!d.completed,
    bestTimeMs:
      typeof d.bestTimeMs === "number" && Number.isFinite(d.bestTimeMs)
        ? d.bestTimeMs
        : null,
    consecutiveDays: clampInt(d.consecutiveDays, 0, 1e6, 0),
  };

  const validIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  const unlocked = Array.isArray(r.unlockedAchievements)
    ? r.unlockedAchievements.filter((id): id is string =>
        typeof id === "string" && validIds.has(id),
      )
    : [];

  // Sessions
  const sessions: SessionEntry[] = Array.isArray(r.sessions)
    ? r.sessions
        .slice(-50)
        .filter((s): s is SessionEntry => !!s && typeof s === "object")
        .map((s) => ({
          ts: clampNumber(s.ts, 0, Number.MAX_SAFE_INTEGER, 0),
          mode: ["campaign", "daily", "zen", "speedrun", "nightmare", "trail"].includes(s.mode as string)
            ? s.mode
            : "campaign",
          level: clampInt(s.level, 1, TOTAL_LEVELS, 1),
          timeMs: clampNumber(s.timeMs, 0, 1e7, 0),
          mistakes: clampInt(s.mistakes, 0, 999, 0),
          passed: !!s.passed,
        }))
    : [];

  // Heatmap
  const heatmap: number[] = new Array(HEATMAP_LEN).fill(0);
  if (Array.isArray(r.mistakeHeatmap)) {
    for (let i = 0; i < HEATMAP_LEN; i++) {
      const v = r.mistakeHeatmap[i];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e6) {
        heatmap[i] = Math.floor(v);
      }
    }
  }

  // Skills
  const sk = (r.skills ?? {}) as Partial<SkillRanks>;
  const skills: SkillRanks = {
    focus: clampInt(sk.focus, 0, 5, 0),
    memory: clampInt(sk.memory, 0, 5, 0),
    speed: clampInt(sk.speed, 0, 5, 0),
    accuracy: clampInt(sk.accuracy, 0, 5, 0),
  };

  // Prestige
  const p = (r.prestige ?? {}) as Partial<PrestigeData>;
  const prestige: PrestigeData = {
    prestiges: clampInt(p.prestiges, 0, 999, 0),
    xpMultiplier: clampNumber(p.xpMultiplier, 1, 100, 1),
  };

  // Login
  const lg = (r.login ?? {}) as Partial<DailyLoginRecord>;
  const login: DailyLoginRecord = {
    lastClaimDate: typeof lg.lastClaimDate === "string" ? lg.lastClaimDate : "",
    streak: clampInt(lg.streak, 0, 9999, 0),
    claimedToday: !!lg.claimedToday,
  };

  // Quests
  const quests: Quest[] = Array.isArray(r.quests)
    ? r.quests.slice(0, 8).filter((q): q is Quest => !!q && typeof q === "object")
        .map((q) => ({
          id: typeof q.id === "string" ? q.id : "",
          period: typeof q.period === "string" ? q.period : "",
          goal: clampInt(q.goal, 1, 1e6, 1),
          progress: clampInt(q.progress, 0, 1e6, 0),
          completed: !!q.completed,
          rewardXp: clampInt(q.rewardXp, 0, 1e6, 0),
          rewardSkillPoints: clampInt(q.rewardSkillPoints, 0, 999, 0),
          kindKey: typeof q.kindKey === "string" ? q.kindKey : "",
        }))
    : [];

  // Leaderboard
  const leaderboard: LeaderboardEntry[] = Array.isArray(r.leaderboard)
    ? r.leaderboard
        .slice(-200)
        .filter((e): e is LeaderboardEntry => !!e && typeof e === "object")
        .map((e) => ({
          ts: clampNumber(e.ts, 0, Number.MAX_SAFE_INTEGER, 0),
          level: clampInt(e.level, 1, TOTAL_LEVELS, 1),
          mode: ["campaign", "daily", "zen", "speedrun", "nightmare", "trail"].includes(e.mode as string)
            ? e.mode
            : "campaign",
          timeMs: clampNumber(e.timeMs, 0, 1e7, 0),
          mistakes: clampInt(e.mistakes, 0, 999, 0),
          name: typeof e.name === "string" ? e.name : undefined,
        }))
    : [];

  // Promo codes
  const validCodeIds = new Set(PROMO_CODES.map((c) => c.id));
  const redeemedCodes: string[] = Array.isArray(r.redeemedCodes)
    ? Array.from(
        new Set(
          r.redeemedCodes.filter(
            (id): id is string => typeof id === "string" && validCodeIds.has(id),
          ),
        ),
      )
    : [];

  // Mini-game stats
  const validMinigameIds = new Set(MINIGAME_IDS);
  const minigames: Record<string, MinigameStat> = {};
  if (r.minigames && typeof r.minigames === "object") {
    for (const [k, v] of Object.entries(r.minigames as Record<string, unknown>)) {
      if (!validMinigameIds.has(k)) continue;
      const m = (v ?? {}) as Partial<MinigameStat>;
      minigames[k] = {
        plays: clampInt(m.plays, 0, 1e6, 0),
        wins: clampInt(m.wins, 0, 1e6, 0),
        bestScore: clampInt(m.bestScore, 0, 1e9, 0),
      };
    }
  }

  // Profile
  const pr = (r.profile ?? {}) as Partial<PlayerProfile>;
  const profile: PlayerProfile = {
    name: typeof pr.name === "string" && pr.name.trim().length > 0 ? pr.name.slice(0, 24) : "Player",
    avatarColor:
      typeof pr.avatarColor === "string" && AVATAR_OPTIONS.some((a) => a.id === pr.avatarColor)
        ? pr.avatarColor
        : AVATAR_OPTIONS[0].id,
    createdAt: typeof pr.createdAt === "number" && pr.createdAt > 0 ? pr.createdAt : Date.now(),
  };

  return {
    highestUnlockedLevel: clampInt(r.highestUnlockedLevel, 1, TOTAL_LEVELS, 1),
    xp: clampNumber(r.xp, 0, 1e12, 0),
    records,
    stats,
    unlockedAchievements: unlocked,
    daily,
    sessions,
    mistakeHeatmap: heatmap,
    skills,
    skillPoints: clampInt(r.skillPoints, 0, 9999, 0),
    prestige,
    login,
    quests,
    leaderboard,
    profile,
    redeemedCodes,
    minigames,
    v: SCHEMA_VERSION,
  };
}

function cloneDefault(): ProgressData {
  return {
    ...DEFAULT_PROGRESS,
    skills: { ...EMPTY_SKILLS },
    prestige: { ...EMPTY_PRESTIGE },
    login: { ...EMPTY_LOGIN },
    daily: { ...EMPTY_DAILY },
    stats: { ...EMPTY_STATS },
    profile: defaultProfile(),
    quests: [],
    sessions: [],
    leaderboard: [],
    mistakeHeatmap: new Array(HEATMAP_LEN).fill(0),
    redeemedCodes: [],
    minigames: {},
  };
}

/* ──────────────────────────────────────────────────────────────────────── */

interface RecordRunReturn {
  newlyUnlockedAchievementIds: string[];
  leveledUp: boolean;
  newlyCompletedQuests: Quest[];
  rewardSkillPoints: number;
}

export type RedeemPromoResult =
  | { ok: true; code: PromoCode }
  | { ok: false; reason: "unknown" | "already_redeemed" };

interface ProgressContextValue {
  progress: ProgressData;
  isUnlocked: (level: number) => boolean;
  recordRun: (level: number, result: RunResult, isFirstClear: boolean) => RecordRunReturn;
  registerDailyResult: (timeMs: number) => void;
  resetProgress: () => void;
  updateProfile: (patch: Partial<PlayerProfile>) => void;
  allocateSkill: (id: keyof SkillRanks) => void;
  resetSkills: () => void;
  prestige: () => void;
  claimDailyLogin: () => number;
  redeemPromoCode: (input: string) => RedeemPromoResult;
  setProgress: (next: ProgressData) => void;
  /**
   * Generic XP grant — used by the mini-games (tic-tac-toe, blackjack) to
   * reward wins. Multiplied by the player's prestige XP buff so it stays
   * consistent with the campaign's reward formula.
   */
  awardXp: (amount: number) => number;
  /**
   * Persist a single mini-game outcome — increments plays/wins counters
   * and lifts the stored bestScore if a higher score was achieved. The
   * `score` semantic is per-game ("higher is better"); games normalise
   * inverted metrics (e.g. fewer moves) before passing them in.
   */
  recordMinigame: (
    id: string,
    patch: { won?: boolean; score?: number },
  ) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState<ProgressData>(() =>
    loadPersisted<ProgressData>({
      key: STORAGE_KEY,
      cookieKey: COOKIE_KEY,
      version: SCHEMA_VERSION,
      validate,
    }),
  );

  const saveQueued = useRef(false);
  useEffect(() => {
    if (saveQueued.current) return;
    saveQueued.current = true;
    queueMicrotask(() => {
      saveQueued.current = false;
      savePersisted({
        key: STORAGE_KEY,
        cookieKey: COOKIE_KEY,
        version: SCHEMA_VERSION,
        value: progress,
      });
    });
  }, [progress]);

  // Daily / quest / login bookkeeping when the day changes.
  useEffect(() => {
    const today = todayKey();

    setProgressState((prev) => {
      let changed = false;
      let next = prev;

      // Daily challenge slot.
      if (prev.daily.date !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ykey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
        const consecutive =
          prev.daily.date === ykey && prev.daily.completed
            ? prev.daily.consecutiveDays
            : prev.daily.date && !prev.daily.completed
              ? 0
              : prev.daily.consecutiveDays;
        next = {
          ...next,
          daily: {
            date: today,
            completed: false,
            bestTimeMs: null,
            consecutiveDays: consecutive,
          },
        };
        changed = true;
      }

      // Daily login window.
      if (prev.login.lastClaimDate !== today) {
        next = {
          ...next,
          login: { ...prev.login, claimedToday: false },
        };
        changed = true;
      }

      // Rotate quests if the period changed.
      const periodMatches = prev.quests.length > 0 && prev.quests[0].period === today;
      if (!periodMatches) {
        next = {
          ...next,
          quests: rollDailyQuests(today, 3),
        };
        changed = true;
      }

      return changed ? next : prev;
    });
  }, []);

  const isUnlocked = useCallback(
    (level: number) => level >= 1 && level <= progress.highestUnlockedLevel,
    [progress.highestUnlockedLevel],
  );

  const recordRun = useCallback<ProgressContextValue["recordRun"]>(
    (level, result, isFirstClear) => {
      void isFirstClear;
      let newlyUnlockedAchievementIds: string[] = [];
      let leveledUp = false;
      let newlyCompletedQuests: Quest[] = [];
      let rewardSkillPoints = 0;

      setProgressState((prev) => {
        const cur = prev.records[level] ?? {
          bestTimeMs: 0,
          bestAccuracy: 0,
          stars: 0,
          attempts: 0,
          completed: false,
        };

        const updatedRecord: LevelRecord = {
          bestTimeMs:
            result.passed && (cur.bestTimeMs === 0 || result.timeMs < cur.bestTimeMs)
              ? result.timeMs
              : cur.bestTimeMs,
          bestAccuracy:
            result.passed && result.accuracy > cur.bestAccuracy
              ? result.accuracy
              : cur.bestAccuracy,
          stars: Math.max(cur.stars, result.passed ? result.stars : 0) as 0 | 1 | 2 | 3,
          attempts: cur.attempts + 1,
          completed: cur.completed || result.passed,
        };

        const newHighest =
          result.passed && result.mode === "campaign"
            ? Math.min(TOTAL_LEVELS, Math.max(prev.highestUnlockedLevel, level + 1))
            : prev.highestUnlockedLevel;
        leveledUp = newHighest > prev.highestUnlockedLevel;

        const stats: AggregateStats = {
          gamesPlayed: prev.stats.gamesPlayed + 1,
          gamesWon: prev.stats.gamesWon + (result.passed ? 1 : 0),
          totalTimeMs: prev.stats.totalTimeMs + result.timeMs,
          totalMistakes: prev.stats.totalMistakes + result.mistakes,
          totalCorrect:
            prev.stats.totalCorrect +
            Math.max(0, result.size * result.size - result.mistakes),
          totalReactionMs:
            prev.stats.totalReactionMs +
            result.reactionAvgMs * (result.size * result.size),
          totalReactionSamples:
            prev.stats.totalReactionSamples + result.size * result.size,
          longestStreak: Math.max(
            prev.stats.longestStreak,
            result.passed ? prev.stats.currentStreak + 1 : 0,
          ),
          currentStreak: result.passed ? prev.stats.currentStreak + 1 : 0,
          comboMax: Math.max(prev.stats.comboMax, result.comboMax),
        };

        // Sessions
        const session: SessionEntry = {
          ts: Date.now(),
          mode: result.mode,
          level: result.level,
          timeMs: result.timeMs,
          mistakes: result.mistakes,
          passed: result.passed,
        };
        const sessions = [...prev.sessions, session].slice(-50);

        // Heatmap
        const heatmap = prev.mistakeHeatmap.slice();
        for (const idx of result.mistakeIndices) {
          if (idx >= 0 && idx < heatmap.length) heatmap[idx] += 1;
        }

        // Quests
        const questResult = reduceQuestsAfterRun(prev.quests, result);
        newlyCompletedQuests = questResult.newlyCompleted;
        rewardSkillPoints = questResult.rewardSkillPoints;

        // Leaderboard insertion (only winning runs)
        let leaderboard = prev.leaderboard;
        if (result.passed) {
          leaderboard = [
            ...prev.leaderboard,
            {
              ts: Date.now(),
              level: result.level,
              mode: result.mode,
              timeMs: result.timeMs,
              mistakes: result.mistakes,
              name: prev.profile.name,
            },
          ]
            .sort((a, b) => a.timeMs - b.timeMs)
            .slice(0, 50);
        }

        const xpGained = result.passed
          ? Math.round(result.xpEarned + questResult.rewardXp)
          : Math.floor(result.xpEarned * 0.2);

        const next: ProgressData = {
          ...prev,
          highestUnlockedLevel: newHighest,
          xp: prev.xp + xpGained,
          records: { ...prev.records, [level]: updatedRecord },
          stats,
          sessions,
          mistakeHeatmap: heatmap,
          skillPoints: prev.skillPoints + questResult.rewardSkillPoints,
          quests: questResult.quests,
          leaderboard,
          unlockedAchievements: prev.unlockedAchievements,
          v: SCHEMA_VERSION,
        };

        const fresh = findNewlyUnlocked(
          { progress: next, lastResult: result },
          prev.unlockedAchievements,
        );
        if (fresh.length > 0) {
          next.unlockedAchievements = [
            ...prev.unlockedAchievements,
            ...fresh.map((a) => a.id),
          ];
        }
        newlyUnlockedAchievementIds = fresh.map((a) => a.id);

        return next;
      });

      return {
        newlyUnlockedAchievementIds,
        leveledUp,
        newlyCompletedQuests,
        rewardSkillPoints,
      };
    },
    [],
  );

  const registerDailyResult = useCallback((timeMs: number) => {
    setProgressState((prev) => {
      const today = todayKey();
      if (prev.daily.date !== today) {
        return {
          ...prev,
          daily: { date: today, completed: true, bestTimeMs: timeMs, consecutiveDays: 1 },
        };
      }
      if (prev.daily.completed) {
        return {
          ...prev,
          daily: {
            ...prev.daily,
            bestTimeMs:
              prev.daily.bestTimeMs == null ? timeMs : Math.min(prev.daily.bestTimeMs, timeMs),
          },
        };
      }
      return {
        ...prev,
        daily: {
          ...prev.daily,
          completed: true,
          bestTimeMs: timeMs,
          consecutiveDays: prev.daily.consecutiveDays + 1,
        },
      };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgressState({
      ...cloneDefault(),
      daily: { ...EMPTY_DAILY, date: todayKey() },
      quests: rollDailyQuests(todayKey(), 3),
    });
  }, []);

  const updateProfile = useCallback((patch: Partial<PlayerProfile>) => {
    setProgressState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...patch,
        name:
          typeof patch.name === "string"
            ? patch.name.slice(0, 24).trim() || prev.profile.name
            : prev.profile.name,
      },
    }));
  }, []);

  const allocateSkill = useCallback((id: keyof SkillRanks) => {
    setProgressState((prev) => {
      if (prev.skillPoints <= 0) return prev;
      if (prev.skills[id] >= 5) return prev;
      return {
        ...prev,
        skills: { ...prev.skills, [id]: prev.skills[id] + 1 },
        skillPoints: prev.skillPoints - 1,
      };
    });
  }, []);

  const resetSkills = useCallback(() => {
    setProgressState((prev) => {
      const refund = totalAllocated(prev.skills);
      return {
        ...prev,
        skills: { ...EMPTY_SKILLS },
        skillPoints: prev.skillPoints + refund,
      };
    });
  }, []);

  const prestige = useCallback(() => {
    setProgressState((prev) => {
      if (prev.highestUnlockedLevel < TOTAL_LEVELS) return prev;
      const nextPrestige = prev.prestige.prestiges + 1;
      return {
        ...prev,
        highestUnlockedLevel: 1,
        records: {},
        skillPoints: prev.skillPoints + 5,
        prestige: {
          prestiges: nextPrestige,
          xpMultiplier: 1 + nextPrestige * 0.05,
        },
      };
    });
  }, []);

  const claimDailyLogin = useCallback((): number => {
    let reward = 0;
    setProgressState((prev) => {
      if (prev.login.claimedToday) return prev;
      const today = todayKey();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const ykey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
      const continued = prev.login.lastClaimDate === ykey;
      const newStreak = continued ? prev.login.streak + 1 : 1;
      reward = 50 + Math.min(450, newStreak * 25);
      return {
        ...prev,
        xp: prev.xp + reward,
        login: { lastClaimDate: today, streak: newStreak, claimedToday: true },
      };
    });
    return reward;
  }, []);

  const redeemPromoCode = useCallback<ProgressContextValue["redeemPromoCode"]>(
    (input) => {
      let outcome: RedeemPromoResult = { ok: false, reason: "unknown" };
      setProgressState((prev) => {
        const lookup = lookupPromoCode(input, prev.redeemedCodes);
        if (!lookup.ok) {
          outcome = lookup;
          return prev;
        }
        const patch = lookup.code.apply(prev);
        const next: ProgressData = {
          ...prev,
          ...patch,
          highestUnlockedLevel: Math.min(
            TOTAL_LEVELS,
            patch.highestUnlockedLevel ?? prev.highestUnlockedLevel,
          ),
          redeemedCodes: [...prev.redeemedCodes, lookup.code.id],
          v: SCHEMA_VERSION,
        };
        outcome = { ok: true, code: lookup.code };
        return next;
      });
      return outcome;
    },
    [],
  );

  const setProgress = useCallback((next: ProgressData) => {
    setProgressState({ ...validate(next) });
  }, []);

  const awardXp = useCallback<ProgressContextValue["awardXp"]>((amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    let granted = 0;
    setProgressState((prev) => {
      granted = Math.max(1, Math.round(amount * prev.prestige.xpMultiplier));
      return { ...prev, xp: prev.xp + granted };
    });
    return granted;
  }, []);

  const recordMinigame = useCallback<ProgressContextValue["recordMinigame"]>(
    (id, { won = false, score }) => {
      if (!MINIGAME_IDS.includes(id)) return;
      setProgressState((prev) => {
        const cur = prev.minigames[id] ?? { plays: 0, wins: 0, bestScore: 0 };
        const next: MinigameStat = {
          plays: cur.plays + 1,
          wins: cur.wins + (won ? 1 : 0),
          bestScore:
            typeof score === "number" && Number.isFinite(score)
              ? Math.max(cur.bestScore, Math.max(0, Math.round(score)))
              : cur.bestScore,
        };
        return {
          ...prev,
          minigames: { ...prev.minigames, [id]: next },
        };
      });
    },
    [],
  );

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      isUnlocked,
      recordRun,
      registerDailyResult,
      resetProgress,
      updateProfile,
      allocateSkill,
      resetSkills,
      prestige,
      claimDailyLogin,
      redeemPromoCode,
      setProgress,
      awardXp,
      recordMinigame,
    }),
    [
      progress,
      isUnlocked,
      recordRun,
      registerDailyResult,
      resetProgress,
      updateProfile,
      allocateSkill,
      resetSkills,
      prestige,
      claimDailyLogin,
      redeemPromoCode,
      setProgress,
      awardXp,
      recordMinigame,
    ],
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
