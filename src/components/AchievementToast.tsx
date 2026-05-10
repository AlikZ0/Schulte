import type { ToastItem } from "../hooks/useToasts";

interface AchievementToastProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function AchievementToast({ toasts, onDismiss }: AchievementToastProps) {
  return (
    <div
      className="fixed right-4 z-[60] flex flex-col gap-2 max-w-[92vw] sm:max-w-sm"
      style={{ top: "calc(max(env(safe-area-inset-top), 44px) + 8px)" }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className="text-left glass rounded-2xl p-3 sm:p-4 shadow-glow border border-white/10
                     animate-rise hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-accent-neon grid place-items-center text-xl shadow-soft">
              <span aria-hidden>{t.icon ?? "★"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{t.title}</div>
              {t.description && (
                <div className="text-xs text-white/55 truncate">
                  {t.description}
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
