import { memo } from "react";
import type { FlashKind } from "../hooks/useScreenFlash";

interface ScreenFlashProps {
  kind: FlashKind;
  ticks: number;
}

const COLOR: Record<NonNullable<FlashKind>, string> = {
  success: "rgba(34, 197, 94, 0.7)",
  fail: "rgba(244, 63, 94, 0.7)",
  neon: "rgba(124, 92, 255, 0.7)",
};

function ScreenFlashComponent({ kind, ticks }: ScreenFlashProps) {
  if (!kind) return null;
  return (
    <div
      key={ticks}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[80] animate-screen-flash"
      style={{
        background: `radial-gradient(80% 60% at 50% 50%, ${COLOR[kind]}, transparent 70%)`,
        mixBlendMode: "screen",
      }}
    />
  );
}

export const ScreenFlash = memo(ScreenFlashComponent);
