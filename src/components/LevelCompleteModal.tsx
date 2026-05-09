import { useEffect } from "react";
import type { RunResult } from "../types";
import { formatTime } from "../utils/formatTime";
import { useSettings } from "../store/SettingsContext";
import { Stars } from "./Stars";

interface LevelCompleteModalProps {
  open: boolean;
  result: RunResult | null;
  onClose: () => void;
  onReplay: () => void;
  onNext?: () => void;
  onMenu: () => void;
}

export function LevelCompleteModal({
  open,
  result,
  onClose,
  onReplay,
  onNext,
  onMenu,
}: LevelCompleteModalProps) {
  const { t } = useSettings();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !result) return null;

  const passed = result.passed;
  const accuracyPct = `${(result.accuracy * 100).toFixed(0)}%`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md glass rounded-3xl p-6 sm:p-8 shadow-soft animate-rise text-center">
        <div
          className={[
            "mx-auto h-16 w-16 rounded-2xl grid place-items-center shadow-glow",
            passed
              ? "bg-gradient-to-br from-accent to-accent-neon"
              : "bg-gradient-to-br from-rose-400 to-pink-600",
          ].join(" ")}
        >
          {passed ? (
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>

        <h2 className="mt-5 text-2xl sm:text-3xl font-bold tracking-tight">
          {passed ? t("result.completed") : t("result.failed")}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          {t("levels.level")} {result.level}
        </p>

        {passed && (
          <div className="mt-4 flex justify-center">
            <Stars count={result.stars} size="lg" />
          </div>
        )}

        {result.isNewBest && passed && (
          <div className="mt-3 inline-block chip text-accent-neon animate-fade-in">
            ✨ {t("result.new_best")}
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3 text-left">
          <div className="glass rounded-2xl py-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-white/45">
              {t("result.time")}
            </div>
            <div className="mt-1 font-mono font-bold text-base sm:text-lg tabular-nums">
              {formatTime(result.timeMs)}
            </div>
          </div>
          <div className="glass rounded-2xl py-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-white/45">
              {t("result.xp")}
            </div>
            <div className="mt-1 font-mono font-bold text-base sm:text-lg tabular-nums text-accent-neon">
              +{result.xpEarned}
            </div>
          </div>
          <div className="glass rounded-2xl py-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-white/45">
              {t("result.accuracy")}
            </div>
            <div className="mt-1 font-mono font-bold text-base sm:text-lg tabular-nums">
              {accuracyPct}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={onMenu} className="btn-ghost flex-1 min-w-[100px]">
            {t("result.menu")}
          </button>
          <button onClick={onReplay} className="btn-ghost flex-1 min-w-[100px]">
            {t("result.replay")}
          </button>
          {passed && onNext && (
            <button onClick={onNext} className="btn-primary flex-1 min-w-[120px]">
              {t("result.next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
