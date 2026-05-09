import { memo, useMemo } from "react";

interface ConfettiProps {
  /** Increments to remount and re-fire. */
  ticks: number;
  count?: number;
  enabled?: boolean;
}

const COLORS = ["#7c5cff", "#22d3ee", "#facc15", "#f472b6", "#34d399"];

function ConfettiComponent({ ticks, count = 28, enabled = true }: ConfettiProps) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const x = (i * 53) % 100;
      const cx = (i % 2 === 0 ? -1 : 1) * (40 + ((i * 17) % 80));
      const delay = ((i * 31) % 250) / 1000;
      const dur = 1 + ((i * 11) % 600) / 1000;
      const color = COLORS[i % COLORS.length];
      const size = 6 + (i % 5);
      return { x, cx, delay, dur, color, size, rotation: i * 23, key: i };
    });
  }, [count]);

  if (!enabled || ticks <= 0) return null;

  return (
    <div key={ticks} className="pointer-events-none fixed inset-0 z-[75] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.key}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: "-12px",
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            background: p.color,
            borderRadius: "2px",
            transform: `rotate(${p.rotation}deg)`,
            ["--cx" as string]: `${p.cx}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

export const Confetti = memo(ConfettiComponent);
