import { formatTime } from "../utils/formatTime";

interface TimerProps {
  ms: number;
  active?: boolean;
  /** Optional target time — paints red when exceeded. */
  targetMs?: number;
  label?: string;
}

export function Timer({ ms, active, targetMs, label = "Time" }: TimerProps) {
  const overTarget = targetMs != null && ms > targetMs;

  return (
    <div
      className={[
        "glass rounded-2xl px-4 py-3 flex items-center gap-3",
        active ? "shadow-glow" : "",
      ].join(" ")}
    >
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
          {label}
        </span>
        <span
          className={[
            "font-mono text-xl sm:text-2xl font-bold tabular-nums transition-colors",
            overTarget ? "text-accent-danger" : "text-white",
          ].join(" ")}
        >
          {formatTime(ms)}
        </span>
      </div>
      <span
        className={[
          "ml-1 h-2.5 w-2.5 rounded-full",
          active ? "bg-accent-neon shadow-neon animate-pulse" : "bg-white/20",
        ].join(" ")}
      />
    </div>
  );
}
