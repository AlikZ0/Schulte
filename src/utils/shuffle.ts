import { mulberry32, shuffleSeeded } from "./seedRandom";

export function shuffle<T>(input: readonly T[]): T[] {
  return shuffleSeeded(input, Math.random);
}

export function generateBoard(size: number, seed?: number): number[] {
  const total = size * size;
  const numbers = Array.from({ length: total }, (_, i) => i + 1);
  if (seed != null) return shuffleSeeded(numbers, mulberry32(seed));
  return shuffle(numbers);
}
