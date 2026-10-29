/** 固定シードで決定的な乱数（mulberry32）。0 以上 1 未満。相撲の rng.ts と同じ方式 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

/** 元の配列は変えずに Fisher-Yates で並べ替えた新しい配列を返す */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function range(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}
