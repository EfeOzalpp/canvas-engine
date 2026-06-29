import type { RenderApi } from "../../render-api";
import type { StarSpec } from "../core";

interface Star {
  x: number;         // normalized 0..1 across width
  y: number;         // normalized 0..1 within topBandPct height
  r: number;         // radius in CSS px
  baseAlpha: number;
  flickerHz: number;
  phase: number;     // random phase offset for flicker desync
}

interface StarsCache {
  specKey: string;
  stars: Star[];
}

const cache = new WeakMap<RenderApi, StarsCache>();

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildStars(spec: StarSpec): Star[] {
  const count = typeof spec.count === "number"
    ? spec.count
    : Math.round(rand(spec.count[0], spec.count[1]));

  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: rand(spec.minR, spec.maxR),
    baseAlpha: rand(spec.alpha[0], spec.alpha[1]),
    flickerHz: rand(spec.flickerHz[0], spec.flickerHz[1]),
    phase: rand(0, Math.PI * 2),
  }));
}

export function drawStars(api: RenderApi, spec: StarSpec): void {
  const { cssWidth: w, cssHeight: h } = api.surface;
  const specKey = `${spec.topBandPct}|${JSON.stringify(spec.count)}|${spec.minR}|${spec.maxR}`;

  let cached = cache.get(api);
  if (!cached || cached.specKey !== specKey) {
    cached = { specKey, stars: buildStars(spec) };
    cache.set(api, cached);
  }

  const bandH = h * (spec.topBandPct / 100);
  const t = performance.now() / 1000;

  for (const star of cached.stars) {
    const flicker = 0.7 + 0.3 * Math.sin(2 * Math.PI * star.flickerHz * t + star.phase);
    const a = Math.min(1, star.baseAlpha * flicker);
    api.drawShape({
      kind: "circle",
      x: star.x * w - star.r,
      y: star.y * bandH - star.r,
      w: star.r * 2,
      h: star.r * 2,
      color: { r: 1, g: 1, b: 1, a },
    });
  }
}