# Schulte Trainer

A premium **mobile-first brain-training PWA** built around the classic Schulte table — with a 100-level campaign, multiple game modes, XP & ranks, a skill tree, prestige, daily logins, quests, achievements, local leaderboards, encrypted local progress, and full theme + accessibility support.

Built with **React + TypeScript + TailwindCSS + Vite**. Zero runtime dependencies beyond React.

## Highlights

### Mobile-first PWA
- Installable to the home screen — manifest, maskable icons, splash screen, theme color
- Service worker with **offline play**, cache-first hashed assets, network-first navigation, stale-while-revalidate fonts
- "Update available" banner with one-tap apply
- Safe-area-inset aware layout (notches, home-indicator)
- Bottom navigation bar with iOS-safe 44 px tap targets
- Swipe gestures between adjacent tabs
- Sticky in-game HUD
- Haptic feedback (Vibration API) wired to taps, mistakes, success
- Anti-pinch-zoom viewport meta
- Boot splash painted in `index.html` so the very first frame is branded

### Performance
- Every screen is **lazy-loaded** via `React.lazy` + `Suspense` (gameplay code only ships when you hit Play)
- GameBoard's heavy modifier effects (fade / jitter / blink / rotate) are **CSS-animation driven** — no per-frame `setState`
- Particle field auto-throttles count on mobile / low-end devices
- `Tile`, `LevelCard`, `SparkLine`, `Heatmap`, `Confetti`, `ParticleField`, `ScreenFlash`, `AnimatedBackdrop` are all `React.memo`-ised
- Heuristic device-power detection (`hardwareConcurrency`, `deviceMemory`) drives particle / backdrop costs
- Production build: ~210 kB main JS / **70 kB gzipped**, screens code-split

### Game modes
| Mode | Description |
| --- | --- |
| **Campaign** | The 100-level progression path with sequential unlock |
| **Daily** | Deterministic per-day seed, daily streak counter |
| **Zen** | No timer, no fail conditions — pure flow |
| **Speedrun** | Tightest target time, no penalties |
| **Nightmare** | Every modifier stacked, only one life, doubled XP |

Each mode is a pure transform on a base level config — implemented as `configureMode(mode, baseLevel)`.

### Difficulty modifiers (data-driven, layered into levels)
`HIDE_HINT`, `REVERSE`, `FADE`, `JITTER`, `BLINK`, `ROTATE`, `MEMORIZE`, `DISTRACTORS`, `TIME_PENALTY`, `LIMITED_LIVES`, `PARTIAL_INVIS`, `FAKE_NUMBERS`. Adding a new modifier is a one-place change in `GameBoard.tsx`.

### Progression systems
- **XP system** with 8 ranks (Novice → Legend)
- **Skill tree**: Focus, Memory, Speed, Accuracy — earn skill points via quests, allocate up to rank 5 each
- **Prestige** at level 100: reset progress for a permanent +5 % XP buff per prestige
- **Daily login** chest with streak-scaling XP reward
- **Daily quests** rotating once per day, deterministic per-date
- **Local leaderboard** (top 50 winning runs, filterable by mode)
- **Achievements** (14 built-in; one-line addition via `utils/achievements.ts`)

### Game feel
- ScreenFlash overlay (success / fail / neon)
- Camera-shake on mistakes
- CSS-only **Confetti** burst on level complete
- Tap **ripple** on every tile
- Combo-driven **dynamic music intensity** (live-synthed pad + shimmer layer)
- Synthesised SFX for click, correct, wrong, complete, fail, unlock — no audio assets

### Accessibility
- 4 unlockable themes (Aurora / Sunset / Synthwave / Monochrome) — driven by CSS variables
- 3 colorblind palettes (Deuteranopia / Protanopia / Tritanopia)
- Dyslexia-friendly font option (Lexend)
- High-contrast mode
- Text scaling (sm / md / lg / xl)
- Left-handed mirror mode (`data-handed="left"`)
- Animation kill-switch + `prefers-reduced-motion` honoring
- Full keyboard navigation (`0–9`, `Enter`, `Esc`, `R`)

### Persistence + anti-cheat
- Saved to **both `localStorage` and a backup `Cookie`**
- **XOR + base64 encryption** layered with an **FNV-1a signature** envelope
- **Strict structural validation** on load — every field clamped to a safe range; tampered or partial saves are gracefully rejected
- **Export / import** flow for manual cloud sync (encrypted text payload)
- Schema versioning baked into every envelope

### Architecture
- **Feature-based folders**: `features/themes`, `features/skills`, `features/quests`, `features/modes`, `features/profile`, `features/pwa`
- **Two React contexts**: `SettingsProvider` (UI / accessibility / language) and `ProgressProvider` (player state)
- **ErrorBoundary** at the root with telemetry hook
- **Telemetry adapter** (`useTelemetry`) — replace the in-memory adapter to wire any analytics provider without touching screens
- **Custom hooks**: `useTimer`, `useSound`, `useMusic`, `useKeyboard`, `useToasts`, `useHaptics`, `useViewport`, `useSwipeGesture`, `useScreenFlash`, `useReducedMotion`, `useTelemetry`
- **i18n**: English (canonical), Русский, Español

## Quick start

```bash
npm install
npm run dev
```

Open the URL printed by Vite. To test the PWA install + service worker, build and preview:

```bash
npm run build
npm run preview
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check (strict) and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check only |

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `0–9` | Type the number of the tile to click (multi-digit buffered) |
| `Enter` / `␣` | Commit the typed number immediately |
| `R` | Restart the current run |
| `Esc` | Exit the current screen |

## Project structure

```
public/
├── manifest.webmanifest
├── sw.js                            offline + cache strategy
├── icon.svg / icon-maskable.svg

src/
├── App.tsx                          screen router with lazy + Suspense + ErrorBoundary
├── main.tsx                         registers the SW
├── index.css                        themes (CSS vars), safe-area, animations, a11y
├── types.ts                         shared types (modes, modifiers, progress shape)
│
├── i18n/                            en (canonical), ru, es
│
├── store/
│   ├── SettingsContext.tsx          themes, accessibility, language, audio
│   └── ProgressContext.tsx          XP, skills, prestige, sessions, heatmap, quests, leaderboard, daily login
│
├── hooks/
│   ├── useTimer / useSound / useMusic / useKeyboard / useToasts
│   ├── useHaptics / useViewport / useSwipeGesture
│   ├── useScreenFlash / useReducedMotion / useTelemetry
│
├── utils/
│   ├── persistence.ts               dual-write (LS + cookie), signed + encrypted envelope
│   ├── encryption.ts                XOR + base64 + checksum
│   ├── exportImport.ts              user-facing backup / restore
│   ├── cookies.ts
│   ├── shuffle.ts / seedRandom.ts
│   ├── formatTime.ts
│   ├── levels.ts                    100-level config generator + tier mapping + XP/star rules
│   ├── ranks.ts
│   ├── dynamicDifficulty.ts         level recommendation + focus score
│   └── achievements.ts
│
├── features/
│   ├── pwa/registerSW.ts
│   ├── themes/themesConfig.ts       4 themes (CSS vars), unlock rules
│   ├── themes/accessibility.ts      colorblind / contrast / scale / dyslexia / handed
│   ├── skills/skillsConfig.ts
│   ├── skills/applySkills.ts        pure transformer over LevelConfig
│   ├── quests/questsConfig.ts       deterministic daily roll
│   ├── quests/questEngine.ts        run → quest progress
│   ├── modes/modes.ts               Zen / Speedrun / Nightmare / Daily / Campaign
│   └── profile/avatars.ts
│
├── components/
│   ├── BottomNav.tsx                mobile bottom navigation
│   ├── ErrorBoundary.tsx
│   ├── InstallPrompt.tsx            beforeinstallprompt floating CTA
│   ├── UpdateBanner.tsx             "new version available" banner
│   ├── AnimatedBackdrop.tsx         conic-gradient backdrop
│   ├── ParticleField.tsx
│   ├── ScreenFlash.tsx
│   ├── Confetti.tsx
│   ├── GameBoard.tsx                CSS-driven modifier effects
│   ├── Tile.tsx                     ripple-on-tap, memoised
│   ├── ModifierBadges.tsx
│   ├── LivesIndicator.tsx
│   ├── Timer.tsx
│   ├── TargetIndicator.tsx
│   ├── Stars.tsx
│   ├── LevelCard.tsx
│   ├── SparkLine.tsx
│   ├── Heatmap.tsx
│   ├── XpBar.tsx
│   ├── RankBadge.tsx
│   ├── LevelCompleteModal.tsx
│   ├── AchievementToast.tsx
│   └── ConfirmDialog.tsx
│
└── screens/                         all lazy-loaded
    ├── MainMenu.tsx                 hero + DDA recommendation + mode carousel
    ├── LevelSelect.tsx              tier-grouped grid with locks + stars
    ├── GameScreen.tsx               run state machine + screen flash + confetti + telemetry
    ├── ProfileScreen.tsx            avatar + name + skills + prestige + daily login
    ├── QuestsScreen.tsx             rotating daily missions
    ├── LeaderboardScreen.tsx        local top-50 with mode filter
    ├── StatsScreen.tsx              XP bar + sparkline trend + mistake heatmap + 12 stat cards
    ├── AchievementsScreen.tsx
    └── SettingsScreen.tsx           audio / accessibility / themes / language / backup / reset
```

## What's intentionally local-only

The brief includes online multiplayer (PvP, friend challenges, weekly tournaments, cloud sync, leaderboards). Those require a backend, so the present build implements a **local equivalent** that keeps the UX cohesive without inventing fake servers:

- **Leaderboard** — top 50 winning runs are stored locally and filterable by mode
- **Cloud sync** — manual encrypted **export / import** flow in Settings → Backup
- **PvP / tournaments** — out of scope for a single-device build; the structure (`LeaderboardEntry`, `RunResult`, profile name) is wire-compatible with a future server adapter

To wire a real backend later, swap `getTelemetryAdapter()` and add a `CloudSyncProvider` next to `ProgressProvider` — the rest of the app already deals in `LeaderboardEntry[]` and `ProgressData` so no screen changes are required.

## License

MIT
