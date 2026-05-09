interface StarsProps {
  count: 0 | 1 | 2 | 3;
  size?: "sm" | "md" | "lg";
}

const SIZES: Record<NonNullable<StarsProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-3xl",
};

export function Stars({ count, size = "md" }: StarsProps) {
  return (
    <div className={["flex gap-1", SIZES[size]].join(" ")} aria-label={`${count} stars`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className={[
            "transition-all",
            i < count
              ? "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
              : "text-white/15",
          ].join(" ")}
        >
          ★
        </span>
      ))}
    </div>
  );
}
