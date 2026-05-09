export interface AvatarOption {
  id: string;
  gradient: string; // tailwind gradient
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "violet",   gradient: "from-violet-400 to-fuchsia-500" },
  { id: "ocean",    gradient: "from-sky-400 to-cyan-500" },
  { id: "emerald",  gradient: "from-emerald-400 to-teal-500" },
  { id: "amber",    gradient: "from-amber-400 to-orange-500" },
  { id: "rose",     gradient: "from-rose-400 to-pink-500" },
  { id: "indigo",   gradient: "from-indigo-400 to-violet-500" },
  { id: "lime",     gradient: "from-lime-400 to-emerald-500" },
  { id: "noir",     gradient: "from-zinc-300 to-zinc-500" },
];

export function gradientById(id: string): string {
  return AVATAR_OPTIONS.find((a) => a.id === id)?.gradient ?? AVATAR_OPTIONS[0].gradient;
}

export function initialsFor(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
