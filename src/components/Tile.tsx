import { memo, useRef } from "react";

export interface TileVisual {
  /** True while the player must not see the number (memorize/partial-invis). */
  hidden: boolean;
  /** Slow CSS-driven fade animation enabled? */
  fade: boolean;
  /** Subtle jitter animation enabled? */
  jitter: boolean;
  /** Blink class (toggled externally — kept brief). */
  blink: boolean;
  /** Hue rotation in degrees applied via CSS variable. */
  hue: number;
  /** Counter-rotation degrees applied to the number to keep it upright. */
  counterRotation: number;
}

interface TileProps {
  value: number;
  size: number;
  isFound: boolean;
  isWrong: boolean;
  isNext: boolean;
  visual: TileVisual;
  disabled: boolean;
  onClick: (value: number) => void;
}

function fontClassFor(size: number): string {
  if (size <= 4) return "text-3xl sm:text-4xl";
  if (size === 5) return "text-2xl sm:text-3xl";
  if (size === 6) return "text-xl sm:text-2xl";
  return "text-lg sm:text-xl";
}

function TileComponent({
  value,
  size,
  isFound,
  isWrong,
  isNext,
  visual,
  disabled,
  onClick,
}: TileProps) {
  const ref = useRef<HTMLButtonElement | null>(null);

  const stateClasses = isFound
    ? "bg-gradient-to-br from-accent-success/30 to-accent-success/10 text-accent-success border-accent-success/30 shadow-[0_0_24px_rgba(34,197,94,0.25)] animate-scale-pop"
    : isWrong
      ? "bg-gradient-to-br from-accent-danger/40 to-accent-danger/10 text-white border-accent-danger/50 animate-shake"
      : "text-white/90 hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-soft";

  const hint = isNext && !isFound ? "ring-1 ring-accent/40" : "";
  const fade = visual.fade && !isFound ? "animate-tile-fade" : "";
  const jitter = visual.jitter ? "animate-tile-jitter" : "";
  const blink = visual.blink ? "animate-tile-blink" : "";

  const handleClick = () => {
    // Trigger ripple animation by toggling the class.
    const el = ref.current;
    if (el) {
      el.classList.remove("ripple-active");
      // Force reflow so the animation restarts.
      void el.offsetWidth;
      el.classList.add("ripple-active");
    }
    onClick(value);
  };

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || isFound}
      onClick={handleClick}
      aria-label={`Tile ${value}`}
      className={[
        "tile-base no-select aspect-square w-full rounded-2xl glass border border-white/10",
        "flex items-center justify-center font-bold tabular-nums",
        "transition-[transform,background-color,box-shadow,opacity,filter] duration-200 ease-out will-change-transform",
        "active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-accent-glow",
        fontClassFor(size),
        stateClasses,
        hint,
        fade,
        jitter,
        blink,
      ].join(" ")}
      style={{
        filter: visual.hue !== 0 ? `hue-rotate(${visual.hue}deg)` : undefined,
        animationDelay: visual.jitter ? `${(value % 7) * 90}ms` : undefined,
      }}
    >
      <span
        style={{
          opacity: visual.hidden ? 0 : 1,
          transform: visual.counterRotation
            ? `rotate(${visual.counterRotation}deg)`
            : undefined,
          transition: "opacity 220ms ease-out, transform 600ms ease-out",
          display: "inline-block",
        }}
      >
        {value}
      </span>
    </button>
  );
}

export const Tile = memo(TileComponent);
