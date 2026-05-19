import type { BackgroundSpec } from "../../../adjustable-rules/backgrounds";
import type { PLike } from "../../p/makeP";
import { clamp01 } from "../../../shared/math";
import { mix } from "./color";

function hash01(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453123;
  return x - Math.floor(x);
}

function isRangePair(
  value: [number, number] | readonly [[number, number], [number, number]]
): value is readonly [[number, number], [number, number]] {
  return Array.isArray(value[0]);
}

function resolveStarRange(
  value: [number, number] | readonly [[number, number], [number, number]],
  liveAvg: number
): readonly [number, number] {
  if (!isRangePair(value)) return value;
  return [
    mix(value[0][0], value[1][0], clamp01(liveAvg)),
    mix(value[0][1], value[1][1], clamp01(liveAvg)),
  ] as const;
}

export function drawStars(
  p: PLike,
  ctx: CanvasRenderingContext2D,
  spec: NonNullable<BackgroundSpec["stars"]>,
  liveAvg: number
) {
  const t = p.millis() / 1000;
  const maxY = p.height * spec.topBandK;
  const starCount = Math.max(
    0,
    Math.round(typeof spec.count === "number" ? spec.count : mix(spec.count[0], spec.count[1], clamp01(liveAvg)))
  );

  const alphaRange = resolveStarRange(spec.alpha, liveAvg);
  const flickerRange = resolveStarRange(spec.flickerHz, liveAvg);

  ctx.save();
  for (let i = 0; i < starCount; i += 1) {
    const x = hash01(i + 1.11) * p.width;
    const y = hash01(i + 7.73) * maxY;
    const r = spec.minR + (spec.maxR - spec.minR) * hash01(i + 15.37);
    const hz = flickerRange[0] + (flickerRange[1] - flickerRange[0]) * hash01(i + 23.91);
    const phase = hash01(i + 31.17) * Math.PI * 2;
    const twinkle = 0.5 + 0.5 * Math.sin(t * hz * Math.PI * 2 + phase);
    const alpha = alphaRange[0] + (alphaRange[1] - alphaRange[0]) * twinkle;

    ctx.fillStyle = `rgba(245, 248, 255, ${String(alpha)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
