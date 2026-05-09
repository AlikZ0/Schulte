interface LivesIndicatorProps {
  lives: number;
  max: number;
}

export function LivesIndicator({ lives, max }: LivesIndicatorProps) {
  const visibleMax = Math.min(max, 6);

  return (
    <div className="glass rounded-2xl px-4 py-3 flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
        Lives
      </span>
      <div className="mt-1 flex items-center gap-1">
        {Array.from({ length: visibleMax }).map((_, i) => {
          const filled = i < lives;
          return (
            <span
              key={i}
              aria-hidden
              className={[
                "h-3 w-3 rounded-full transition-all",
                filled
                  ? "bg-gradient-to-br from-rose-400 to-pink-500 shadow-[0_0_10px_rgba(244,114,182,0.45)]"
                  : "bg-white/10 border border-white/15",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
