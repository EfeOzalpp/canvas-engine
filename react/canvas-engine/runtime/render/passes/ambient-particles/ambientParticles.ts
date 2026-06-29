import type {
  AmbientParticleLayerSpec,
  AmbientParticlesSceneSpec,
} from "../../../../scene-rules/ambient-particles";
import type { PLike } from "../../../p/makeP";
import { clamp01 } from "../../../../shared/math";
import { mix } from "../shared/color";

interface AmbientParticle {
  xK: number;
  yK: number;
  sizeK: number;
  speedXK: number;
  speedYK: number;
  phaseK: number;
  colorIndex: number;
}

function hash01(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453123;
  return x - Math.floor(x);
}

function resolveCount(count: AmbientParticleLayerSpec["count"], liveAvg: number) {
  return Math.max(
    0,
    Math.round(typeof count === "number" ? count : mix(count[0], count[1], clamp01(liveAvg)))
  );
}

function resolveMaxCount(count: AmbientParticleLayerSpec["count"]) {
  return Math.max(
    0,
    Math.round(typeof count === "number" ? count : Math.max(count[0], count[1]))
  );
}

function makeParticle(layerSeed: number, index: number, colorCount: number): AmbientParticle {
  return {
    xK: hash01(layerSeed + index * 11.13),
    yK: hash01(layerSeed + index * 17.71),
    sizeK: hash01(layerSeed + index * 23.37),
    speedXK: hash01(layerSeed + index * 29.91),
    speedYK: hash01(layerSeed + index * 37.53),
    phaseK: hash01(layerSeed + index * 41.19),
    colorIndex: Math.floor(hash01(layerSeed + index * 47.43) * Math.max(1, colorCount)),
  };
}

function colorForLayer(layer: AmbientParticleLayerSpec, index: number) {
  if (typeof layer.color === "string") {
    return { color: layer.color, alpha: layer.alpha ?? 1 };
  }
  if (layer.color.length === 0) {
    return { color: "rgb(255, 255, 255)", alpha: layer.alpha ?? 1 };
  }
  const choice = layer.color[index % layer.color.length] ?? layer.color[0];
  return {
    color: choice.color,
    alpha: choice.alpha ?? layer.alpha ?? 1,
  };
}

function wrap01(value: number) {
  return ((value % 1) + 1) % 1;
}

function drawDotParticle(args: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  const { ctx, x, y, size, color } = args;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}

function drawRainParticle(args: {
  ctx: CanvasRenderingContext2D;
  layer: AmbientParticleLayerSpec;
  particle: AmbientParticle;
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  const { ctx, layer, particle, x, y, size, color } = args;
  const lengthMin = layer.lengthPx?.[0] ?? size * 5;
  const lengthMax = layer.lengthPx?.[1] ?? size * 9;
  const slantMin = layer.slantPx?.[0] ?? -size * 1.8;
  const slantMax = layer.slantPx?.[1] ?? -size * 3;
  const lineMin = layer.lineWidthPx?.[0] ?? Math.max(0.5, size * 0.45);
  const lineMax = layer.lineWidthPx?.[1] ?? Math.max(lineMin, size * 0.75);

  const length = mix(lengthMin, lengthMax, particle.sizeK);
  const slant = mix(slantMin, slantMax, particle.speedXK);
  const lineWidth = mix(lineMin, lineMax, particle.speedYK);

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + slant, y + length);
  ctx.stroke();
}

function drawLayer(args: {
  p: PLike;
  layer: AmbientParticleLayerSpec;
  liveAvg: number;
  timeSec: number;
  compositeAlpha: number;
}) {
  const { p, layer, liveAvg, timeSec, compositeAlpha } = args;
  const count = resolveCount(layer.count, liveAvg);
  if (count <= 0 || compositeAlpha <= 0) return;

  const maxCount = resolveMaxCount(layer.count);
  const xRange = layer.xRange ?? [0, 1];
  const yRange = layer.yRange ?? [0, 1];
  const speedXRange = layer.speedX ?? [3, 10];
  const speedYRange = layer.speedY ?? [0, 0];
  const colorCount = typeof layer.color === "string" ? 1 : layer.color.length;
  const seed = layer.seed ?? 1;
  const ctx = p.drawingContext;

  ctx.save();
  for (let i = 0; i < Math.min(count, maxCount); i += 1) {
    const particle = makeParticle(seed, i, colorCount);
    const speedXPx = mix(speedXRange[0], speedXRange[1], particle.speedXK);
    const speedYPx = mix(speedYRange[0], speedYRange[1], particle.speedYK);
    const rangeW = Math.max(1, (xRange[1] - xRange[0]) * p.width);
    const rangeH = Math.max(1, (yRange[1] - yRange[0]) * p.height);
    const xK = xRange[0] + (xRange[1] - xRange[0]) * wrap01(
      particle.xK + (timeSec * speedXPx) / rangeW
    );
    const yK = yRange[0] + (yRange[1] - yRange[0]) * wrap01(
      particle.yK + particle.phaseK + (timeSec * speedYPx) / rangeH
    );
    const size = mix(layer.sizePx[0], layer.sizePx[1], particle.sizeK);
    const { color, alpha } = colorForLayer(layer, particle.colorIndex);
    const x = xK * p.width;
    const y = yK * p.height;

    ctx.globalAlpha = clamp01(alpha * compositeAlpha);
    if (layer.shape === "rain") {
      drawRainParticle({ ctx, layer, particle, x, y, size, color });
    } else {
      drawDotParticle({ ctx, x, y, size, color });
    }
  }
  ctx.restore();
}

export function drawAmbientParticles(args: {
  p: PLike;
  spec?: AmbientParticlesSceneSpec | null;
  liveAvg: number;
  timeMs: number;
  compositeAlpha?: number;
}) {
  const { p, spec, liveAvg, timeMs, compositeAlpha = 1 } = args;
  if (!spec || spec.layers.length === 0 || compositeAlpha <= 0) return;

  const timeSec = timeMs / 1000;
  for (const layer of spec.layers) {
    drawLayer({ p, layer, liveAvg, timeSec, compositeAlpha });
  }
}
