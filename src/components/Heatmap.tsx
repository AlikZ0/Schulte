import { memo } from "react";

interface HeatmapProps {
  /** Mistake counts indexed by board position (row-major). */
  values: number[];
  /** Grid edge — usually 7 to fit the largest level. */
  size?: number;
}

function HeatmapComponent({ values, size = 7 }: HeatmapProps) {
  const cells: number[] = [];
  for (let i = 0; i < size * size; i++) cells.push(values[i] ?? 0);

  const max = Math.max(1, ...cells);

  return (
    <div
      className="grid w-full max-w-xs mx-auto rounded-2xl glass p-2"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gap: "4px",
        aspectRatio: "1 / 1",
      }}
      role="img"
      aria-label="Mistake heatmap"
    >
      {cells.map((v, i) => {
        const t = v / max;
        const bg = t === 0 ? "rgba(255,255,255,0.04)" : `rgba(244, 63, 94, ${0.2 + t * 0.7})`;
        return (
          <div
            key={i}
            title={`${v}`}
            className="rounded-md transition-colors"
            style={{ background: bg }}
          />
        );
      })}
    </div>
  );
}

export const Heatmap = memo(HeatmapComponent);
