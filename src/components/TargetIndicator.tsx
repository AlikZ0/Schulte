interface TargetIndicatorProps {
  target: number | null;
  total: number;
  found: number;
  /** When true, hide the actual number value (HIDE_HINT). */
  hidden?: boolean;
  label: string;
}

export function TargetIndicator({
  target,
  total,
  found,
  hidden = false,
  label,
}: TargetIndicatorProps) {
  const progress = total === 0 ? 0 : Math.min(1, found / total);

  return (
    <div className="glass rounded-2xl px-4 py-3 flex items-center gap-4 min-w-[180px]">
      <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-accent-glow grid place-items-center shadow-soft animate-pulse-soft">
        <span className="font-extrabold text-xl text-white tabular-nums">
          {hidden ? "?" : (target ?? "—")}
        </span>
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
          {label}
        </span>
        <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-neon transition-all duration-300 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="mt-1 text-xs text-white/55 tabular-nums">
          {found} / {total}
        </span>
      </div>
    </div>
  );
}
