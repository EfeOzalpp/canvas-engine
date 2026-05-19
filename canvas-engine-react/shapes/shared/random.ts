export function shapeHash32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function seededUnit(seed: number): number {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function seeded01(key: string | number, salt = ""): number {
  return seededUnit(shapeHash32(`${String(key)}|${salt}`));
}

// Some older shapes used tag first. Keeping that exact order preserves their
// cached visual variants while still moving the hash helper into one place.
export function seededTag01(key: string | number, tag: string): number {
  return seededUnit(shapeHash32(`${tag}|${String(key)}`));
}

export function pick<T>(items: readonly T[], unit: number): T {
  if (items.length === 0) throw new Error("Cannot pick from an empty shape list");
  const index = Math.floor(unit * items.length) % items.length;
  return items[index] ?? items[0];
}

export function pickByOccurrence<T>(items: readonly T[], occurrence = 0, offset = 0): T {
  if (items.length === 0) throw new Error("Cannot pick from an empty shape list");
  const index = (Math.max(0, occurrence) + offset) % items.length;
  return items[index] ?? items[0];
}
