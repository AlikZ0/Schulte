import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";

import { SettingsProvider, useSettings } from "./store/SettingsContext";
import { ProgressProvider, useProgress } from "./store/ProgressContext";

import { AnimatedBackdrop } from "./components/AnimatedBackdrop";
import { ParticleField } from "./components/ParticleField";
import { AchievementToast } from "./components/AchievementToast";
import { BottomNav } from "./components/BottomNav";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { InstallPrompt } from "./components/InstallPrompt";
import { UpdateBanner } from "./components/UpdateBanner";

import { useToasts } from "./hooks/useToasts";
import { useMusic } from "./hooks/useMusic";
import { useViewport } from "./hooks/useViewport";
import { useSwipeGesture } from "./hooks/useSwipeGesture";
import { ACHIEVEMENTS } from "./utils/achievements";

import type { GameMode, Screen } from "./types";
import type { TranslationKey } from "./i18n";

// Lazy-load every screen — boots faster on mobile and keeps the menu
// chunk tiny.
const MainMenu = lazy(() => import("./screens/MainMenu").then((m) => ({ default: m.MainMenu })));
const LevelSelect = lazy(() => import("./screens/LevelSelect").then((m) => ({ default: m.LevelSelect })));
const GameScreen = lazy(() => import("./screens/GameScreen").then((m) => ({ default: m.GameScreen })));
const StatsScreen = lazy(() => import("./screens/StatsScreen").then((m) => ({ default: m.StatsScreen })));
const AchievementsScreen = lazy(() => import("./screens/AchievementsScreen").then((m) => ({ default: m.AchievementsScreen })));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen").then((m) => ({ default: m.SettingsScreen })));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const QuestsScreen = lazy(() => import("./screens/QuestsScreen").then((m) => ({ default: m.QuestsScreen })));
const LeaderboardScreen = lazy(() => import("./screens/LeaderboardScreen").then((m) => ({ default: m.LeaderboardScreen })));
const TicTacToeScreen = lazy(() => import("./screens/TicTacToeScreen").then((m) => ({ default: m.TicTacToeScreen })));

/* ──────────────────────────────────────────────────────────────────────────
   Inner shell — uses the contexts.
   ──────────────────────────────────────────────────────────────────────── */

const SCREEN_ORDER: Screen[] = [
  "menu",
  "levels",
  "quests",
  "leaderboard",
  "stats",
  "achievements",
  "tictactoe",
  "profile",
  "settings",
];

function AppShell() {
  const { settings, t } = useSettings();
  const { isUnlocked } = useProgress();
  const viewport = useViewport();

  const [screen, setScreen] = useState<Screen>("menu");
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [mode, setMode] = useState<GameMode>("campaign");
  const [musicIntensity, setMusicIntensity] = useState(0);

  const { toasts, push, dismiss } = useToasts();
  const swipeRef = useRef<HTMLDivElement | null>(null);

  useMusic(settings.music, musicIntensity);

  const navigate = useCallback((next: Screen) => {
    setScreen(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, []);

  const startLevel = useCallback(
    (level: number, m: GameMode) => {
      const targetLevel = m === "campaign" ? Math.max(1, level) : level;
      if (m === "campaign" && !isUnlocked(targetLevel)) return;
      setMode(m);
      setActiveLevel(targetLevel);
      setScreen("game");
    },
    [isUnlocked],
  );

  const handleAchievementsUnlocked = useCallback(
    (ids: string[]) => {
      for (const id of ids) {
        const ach = ACHIEVEMENTS.find((a) => a.id === id);
        if (!ach) continue;
        push({
          icon: ach.icon,
          title: t(ach.titleKey as TranslationKey),
          description: t(ach.descriptionKey as TranslationKey),
        });
      }
    },
    [push, t],
  );

  const handleLevelUp = useCallback(
    (newHighest: number) => {
      push({
        icon: "🔓",
        title: `${t("result.unlocked")} ${newHighest}`,
        ttl: 3500,
      });
    },
    [push, t],
  );

  // Swipe between adjacent navigable screens (skips game screen).
  const swipeIndex = useMemo(() => SCREEN_ORDER.indexOf(screen), [screen]);
  useSwipeGesture(swipeRef, {
    enabled: screen !== "game" && viewport.isMobile,
    onSwipeLeft: () => {
      if (swipeIndex >= 0 && swipeIndex < SCREEN_ORDER.length - 1) {
        navigate(SCREEN_ORDER[swipeIndex + 1]);
      }
    },
    onSwipeRight: () => {
      if (swipeIndex > 0) navigate(SCREEN_ORDER[swipeIndex - 1]);
    },
  });

  const lowEnd = viewport.isLowEnd || viewport.isMobile;

  const fallback = (
    <div className="min-h-[40vh] grid place-items-center">
      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-accent to-accent-neon shadow-glow animate-pulse" />
    </div>
  );

  return (
    <div ref={swipeRef} className="min-h-dvh w-full text-white relative">
      <AnimatedBackdrop enabled={settings.animations && !lowEnd} />
      <ParticleField
        enabled={settings.animations}
        lowPower={lowEnd}
        count={lowEnd ? 14 : 28}
      />

      <Suspense fallback={fallback}>
        {screen === "menu" && (
          <MainMenu onNavigate={navigate} onPlay={startLevel} />
        )}
        {screen === "levels" && <LevelSelect onSelect={startLevel} />}
        {screen === "game" && (
          <GameScreen
            level={activeLevel}
            mode={mode}
            onExit={() => setScreen(mode === "daily" ? "menu" : "levels")}
            onChangeLevel={setActiveLevel}
            onIntensityChange={setMusicIntensity}
            onAchievementsUnlocked={handleAchievementsUnlocked}
            onLevelUp={handleLevelUp}
          />
        )}
        {screen === "stats" && <StatsScreen />}
        {screen === "achievements" && <AchievementsScreen />}
        {screen === "settings" && <SettingsScreen />}
        {screen === "profile" && <ProfileScreen />}
        {screen === "quests" && <QuestsScreen />}
        {screen === "leaderboard" && <LeaderboardScreen />}
        {screen === "tictactoe" && <TicTacToeScreen onExit={() => navigate("menu")} />}
      </Suspense>

      <AchievementToast toasts={toasts} onDismiss={dismiss} />
      <InstallPrompt />
      <UpdateBanner />

      {screen !== "game" && <BottomNav screen={screen} onNavigate={navigate} />}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Public root — wraps the app with providers and an ErrorBoundary.
   ──────────────────────────────────────────────────────────────────────── */

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ProgressProvider>
          <AppShell />
        </ProgressProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
