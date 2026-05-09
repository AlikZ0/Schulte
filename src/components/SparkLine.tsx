import { memo, useMemo } from "react";

interface SparkLineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
  /** Optional baseline value to compare against. */
  baseline?: number;
}

function SparkLineComponent({
  values,
  width = 240,
  height = 64,
  stroke = "var(--accent-neon)",
  fill = "var(--accent-glow)",
  className = "",
  baseline,
}: SparkLineProps) {
  const path = useMemo(() => {
    if (values.length === 0) return { line: "", area: "", points: [] as string[] };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = values.length > 1 ? width / (values.length - 1) : width;
    const points = values.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = `M${points.join(" L")}`;
    const area = `${line} L${(values.length - 1) * stepX},${height} L0,${height} Z`;
    return { line, area, points };
  }, [values, width, height]);

  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const baselineY =
    baseline != null ? height - ((baseline - min) / (max - min || 1)) * height : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      role="img"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fill} stopOpacity="0.45" />
          <stop offset="1" stopColor={fill} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={path.area} fill="url(#sparkFill)" />
      <path
        d={path.line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {baselineY != null && (
        <line
          x1="0"
          x2={width}
          y1={baselineY}
          y2={baselineY}
          stroke="rgba(255,255,255,0.18)"
          strokeDasharray="3 3"
        />
      )}
    </svg>
  );
}

export const SparkLine = memo(SparkLineComponent);
