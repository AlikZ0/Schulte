import { memo, useMemo } from "react";

interface ParticleFieldProps {
  count?: number;
  enabled?: boolean;
  /** When true, halves the particle count for cheaper rendering. */
  lowPower?: boolean;
}

function ParticleFieldComponent({
  count = 28,
  enabled = true,
  lowPower = false,
}: ParticleFieldProps) {
  const effective = lowPower ? Math.max(8, Math.floor(count * 0.5)) : count;
  const particles = useMemo(() => {
    return Array.from({ length: effective }).map((_, i) => {
      const x = (i * 9301 + 49297) % 100;
      const y = (i * 16811 + 32119) % 100;
      const delay = ((i * 137) % 600) / 100;
      const duration = 12 + ((i * 53) % 12);
      const size = 1 + (i % 3);
      const hue = (i * 47) % 360;
      return { x, y, delay, duration, size, hue, key: i };
    });
  }, [effective]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.key}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `hsl(${(220 + p.hue) % 360}, 80%, 70%)`,
            filter: "blur(0.5px)",
            opacity: 0.35,
            animation: `particleDrift ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

export const ParticleField = memo(ParticleFieldComponent);
