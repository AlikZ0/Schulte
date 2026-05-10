import { useLayoutEffect, useRef } from "react";

import type { Screen } from "../types";
import { useSettings } from "../store/SettingsContext";

interface BottomNavProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}

interface Tab {
  screen: Screen;
  labelKey: Parameters<ReturnType<typeof useSettings>["t"]>[0];
  icon: JSX.Element;
}

const TABS: Tab[] = [
  {
    screen: "menu",
    labelKey: "menu.profile",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l2-2 7-7 7 7 2 2" />
        <path d="M5 10v10a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V10" />
      </svg>
    ),
  },
  {
    screen: "levels",
    labelKey: "menu.levels",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    screen: "quests",
    labelKey: "menu.quests",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    screen: "stats",
    labelKey: "menu.stats",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="20" x2="21" y2="20" />
        <line x1="6" y1="20" x2="6" y2="11" />
        <line x1="11" y1="20" x2="11" y2="6" />
        <line x1="16" y1="20" x2="16" y2="14" />
      </svg>
    ),
  },
  {
    screen: "settings",
    labelKey: "menu.settings",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 4.36 16.96l.06-.06A1.65 1.65 0 0 0 4.75 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9 1.65 1.65 0 0 0 4.27 7.18l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.6 1.65 1.65 0 0 0 9.92 3.09V3a2 2 0 1 1 4 0v.09c0 .66.39 1.27 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.24.61.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function BottomNav({ screen, onNavigate }: BottomNavProps) {
  const { t } = useSettings();
  const navRef = useRef<HTMLElement | null>(null);

  /*
   * Measure the actual rendered height of the nav (including safe-area
   * inset, font scaling, dynamic content) and expose it as a CSS variable
   * --bottom-nav-height on <html>. The .has-bottom-nav utility consumes
   * that variable so every screen always reserves the exact right amount
   * of bottom padding — even on phones with a home-indicator bar or
   * accessibility text scaling turned up.
   */
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--bottom-nav-height", `${el.offsetHeight}px`);
    };
    update();

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      // We deliberately keep --bottom-nav-height on <html> across nav
      // mount/unmount cycles. The GameScreen also uses .has-bottom-nav
      // and benefits from the last known measurement; otherwise it
      // would briefly snap to the fallback during the transition.
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed left-0 right-0 bottom-0 z-40 lh-mirror"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="mx-auto max-w-md px-3">
        <div className="glass rounded-2xl shadow-soft flex items-stretch justify-between gap-1 px-2 py-1.5">
          {TABS.map((tab) => {
            const active = screen === tab.screen;
            return (
              <button
                key={tab.screen}
                type="button"
                onClick={() => onNavigate(tab.screen)}
                aria-label={t(tab.labelKey)}
                className={[
                  "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-1",
                  "text-[10px] font-semibold transition-all",
                  active
                    ? "bg-gradient-to-br from-accent to-accent-glow text-white shadow-glow"
                    : "text-white/55 hover:text-white",
                ].join(" ")}
              >
                {tab.icon}
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
