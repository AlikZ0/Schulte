import { useEffect, useMemo, useState } from "react";
import { Tile, type TileVisual } from "./Tile";
import type { LevelConfig, Modifier } from "../types";

interface GameBoardProps {
  config: LevelConfig;
  numbers: number[];
  found: Set<number>;
  wrong: number | null;
  target: number | null;
  forceShowAll?: boolean;
  forceHideAll?: boolean;
  hintOverride?: boolean;
  disabled: boolean;
  onTileClick: (value: number) => void;
}

const HAS = (mods: Modifier[], m: Modifier) => mods.includes(m);

export function GameBoard({
  config,
  numbers,
  found,
  wrong,
  target,
  forceShowAll = false,
  forceHideAll = false,
  hintOverride = false,
  disabled,
  onTileClick,
}: GameBoardProps) {
  const { size, modifiers } = config;
  const total = numbers.length;

  // Compute static per-tile decorators (hue, partial-invis assignment) once
  // per board so we don't churn on parent re-renders.
  const seeds = useMemo(() => {
    const map = new Map<number, { hue: number; invis: boolean }>();
    for (const n of numbers) {
      const s = (n * 9301 + 49297) % 233280;
      const r = s / 233280;
      map.set(n, {
        hue: HAS(modifiers, "DISTRACTORS") ? Math.round((r - 0.5) * 220) : 0,
        invis: HAS(modifiers, "PARTIAL_INVIS") ? r < 0.35 : false,
      });
    }
    return map;
  }, [numbers, modifiers]);

  // BLINK runs as a tiny interval that flips a single state of currently
  // blinking values (max ~4 at a time).
  const [blinkSet, setBlinkSet] = useState<Set<number>>(() => new Set());
  useEffect(() => {
    if (!HAS(modifiers, "BLINK")) {
      setBlinkSet(new Set());
      return;
    }
    let timeoutClear = 0;
    const id = window.setInterval(() => {
      const next = new Set<number>();
      const count = Math.max(1, Math.floor(total * 0.06));
      for (let i = 0; i < count; i++) {
        next.add(numbers[Math.floor(Math.random() * total)]);
      }
      setBlinkSet(next);
      timeoutClear = window.setTimeout(() => setBlinkSet(new Set()), 250);
    }, 800);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(timeoutClear);
    };
  }, [modifiers, numbers, total]);

  // Board rotation runs as a single CSS transition driven by an interval.
  const [boardRotation, setBoardRotation] = useState(0);
  useEffect(() => {
    if (!HAS(modifiers, "ROTATE")) {
      setBoardRotation(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const elapsed = (t - start) / 1000;
      // Smooth, slow tilt + rotation.
      setBoardRotation(Math.sin(elapsed * 0.4) * 22 + (elapsed * 8) / 6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [modifiers]);

  const fadeOn = HAS(modifiers, "FADE");
  const jitterOn = HAS(modifiers, "JITTER");

  const gap =
    size >= 7 ? "0.4rem" : size === 6 ? "0.5rem" : size === 5 ? "0.6rem" : "0.7rem";
  const hintForcedOn = hintOverride;

  return (
    <div
      className="w-full max-w-[min(92vmin,640px)] mx-auto p-2 sm:p-3 rounded-3xl glass shadow-soft animate-rise"
      style={{ touchAction: "manipulation" }}
    >
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gap,
          transform: `rotate(${boardRotation}deg)`,
          transformOrigin: "center",
          transition: "transform 800ms cubic-bezier(.45,.05,.55,.95)",
        }}
      >
        {numbers.map((n) => {
          const seed = seeds.get(n)!;
          const isFound = found.has(n);
          const isNext =
            target === n && (!HAS(modifiers, "HIDE_HINT") || hintForcedOn);
          const showNumber = forceHideAll
            ? false
            : forceShowAll
              ? true
              : !isFound && (!seed.invis || target === n);

          const visual: TileVisual = {
            hidden: !showNumber,
            fade: fadeOn,
            jitter: jitterOn,
            blink: blinkSet.has(n),
            hue: seed.hue,
            counterRotation: -boardRotation,
          };

          return (
            <Tile
              key={n}
              value={n}
              size={size}
              isFound={isFound}
              isWrong={wrong === n}
              isNext={isNext}
              visual={visual}
              disabled={disabled}
              onClick={onTileClick}
            />
          );
        })}
      </div>
    </div>
  );
}
