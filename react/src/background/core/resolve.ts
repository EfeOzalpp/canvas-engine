import type { AnchorContext, GradientStop, StopK } from "./types";

export interface ResolvedStop {
  position: number;   // 0–1 (normalized from %)
  rgba: string;
  rightRgba: string | undefined;
  holdToNext: boolean;
}

function resolveK(k: StopK, ctx: AnchorContext): number {
  if (typeof k === "number") return k;
  if (k === "horizon") return ctx.horizon;
  return ctx.horizon + (k.offset ?? 0);
}

// Distributes un-anchored stops evenly between their nearest anchored neighbours,
// then normalizes all positions from % to 0–1.
export function resolveStops(
  stops: readonly GradientStop[],
  ctx: AnchorContext
): ResolvedStop[] {
  // First pass: resolve stops that have an explicit k.
  const known: (number | undefined)[] = stops.map((s) =>
    s.k !== undefined ? resolveK(s.k, ctx) : undefined
  );

  // Second pass: fill gaps by linear interpolation between known neighbours.
  const resolved: number[] = new Array(stops.length);

  // Clamp boundaries: if first or last are unknown, anchor at 0 / 100.
  if (known[0] === undefined) known[0] = 0;
  if (known[known.length - 1] === undefined) known[known.length - 1] = 100;

  for (let i = 0; i < stops.length; i++) {
    if (known[i] !== undefined) {
      resolved[i] = known[i]!;
      continue;
    }

    // Find the previous and next known neighbours.
    let prevI = i - 1;
    while (prevI >= 0 && known[prevI] === undefined) prevI--;
    let nextI = i + 1;
    while (nextI < stops.length && known[nextI] === undefined) nextI++;

    const prevK = known[prevI] ?? 0;
    const nextK = known[nextI] ?? 100;
    const span = nextI - prevI;
    resolved[i] = prevK + ((nextK - prevK) * (i - prevI)) / span;
  }

  return stops.map((stop, i) => ({
    position: resolved[i] / 100,
    rgba: stop.rgba,
    rightRgba: stop.rightRgba,
    holdToNext: stop.holdToNext ?? false,
  }));
}