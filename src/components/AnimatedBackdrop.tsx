import { memo } from "react";

interface AnimatedBackdropProps {
  enabled?: boolean;
}

/**
 * Single-element conic-gradient driven backdrop. ~0 JS cost, GPU-accelerated.
 * Rendered behind the content via fixed positioning + z-index: -1.
 */
function AnimatedBackdropComponent({ enabled = true }: AnimatedBackdropProps) {
  if (!enabled) return null;
  return <div className="animated-backdrop" aria-hidden />;
}

export const AnimatedBackdrop = memo(AnimatedBackdropComponent);
