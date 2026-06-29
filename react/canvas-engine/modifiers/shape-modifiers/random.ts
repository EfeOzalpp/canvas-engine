import { hashString32 } from "../../shared/hash32";

export function shapeHash32(input: string): number {
  return hashString32(input);
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
