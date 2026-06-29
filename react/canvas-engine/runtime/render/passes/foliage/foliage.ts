import type { BackgroundAnchorContext, BackgroundStopK } from "../../../../scene-rules/backgrounds";
import { resolveStopKValue } from "../background/anchors";
import type { FoliageLayerSpec, FoliageSceneSpec } from "../../../../scene-rules/foliage";
import type { PLike } from "../../../p/makeP";
import { clamp01 } from "../../../../shared/math";
import { mix } from "../shared/color";

interface FoliagePiece {
  xK: number;
  yJitter: number;
  heightK: number;
  widthK: number;
  leanK: number;
  colorIndex: number;
}

function hash01(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453123;
  return x - Math.floor(x);
}

function resolveCount(count: FoliageLayerSpec["count"], liveAvg: number) {
  return Math.max(
    0,
    Math.round(typeof count === "number" ? count : mix(count[0], count[1], clamp01(liveAvg)))
  );
}

function resolveMaxCount(count: FoliageLayerSpec["count"]) {
  return Math.max(
    0,
    Math.round(typeof count === "number" ? count : Math.max(count[0], count[1]))
  );
}

function colorForLayer(layer: FoliageLayerSpec, index: number) {
  if (typeof layer.color === "string") {
    return { color: layer.color, alpha: layer.alpha ?? 1 };
  }
  if (layer.color.length === 0) {
    return { color: "rgb(80, 120, 90)", alpha: layer.alpha ?? 1 };
  }
  const choice = layer.color[index % layer.color.length] ?? layer.color[0];
  return {
    color: choice.color,
    alpha: choice.alpha ?? layer.alpha ?? 1,
  };
}

function remapXExclude(xK: number, exclude: readonly [number, number]): number {
  const gap = Math.max(0, exclude[1] - exclude[0]);
  const available = 1 - gap;
  if (available <= 0) return 0;
  const scaled = xK * available;
  return scaled < exclude[0] ? scaled : scaled + gap;
}

function makePiece(layerSeed: number, index: number, colorCount: number): FoliagePiece {
  return {
    xK: hash01(layerSeed + index * 11.13),
    yJitter: hash01(layerSeed + index * 17.71) * 2 - 1,
    heightK: hash01(layerSeed + index * 23.37),
    widthK: hash01(layerSeed + index * 29.91),
    leanK: hash01(layerSeed + index * 37.53) * 2 - 1,
    colorIndex: Math.floor(hash01(layerSeed + index * 41.19) * Math.max(1, colorCount)),
  };
}

function drawLayer(args: {
  p: PLike;
  layer: FoliageLayerSpec;
  liveAvg: number;
  anchors?: BackgroundAnchorContext;
}) {
  const { p, layer, liveAvg, anchors } = args;
  const count = resolveCount(layer.count, liveAvg);
  if (count <= 0) return;

  const maxCount = resolveMaxCount(layer.count);
  const colorCount = typeof layer.color === "string" ? 1 : layer.color.length;
  const xRange = layer.xRange ?? [0, 1];
  const yKTuple = Array.isArray(layer.yK) ? (layer.yK as readonly [BackgroundStopK, BackgroundStopK]) : null;
  const yMin = resolveStopKValue(yKTuple ? yKTuple[0] : (layer.yK as BackgroundStopK), anchors) * p.height;
  const yMax = yKTuple ? resolveStopKValue(yKTuple[1], anchors) * p.height : yMin;
  const minH = Math.max(1, layer.heightPx[0]);
  const maxH = Math.max(minH, layer.heightPx[1]);
  const minW = Math.max(1, layer.widthPx?.[0] ?? 2);
  const maxW = Math.max(minW, layer.widthPx?.[1] ?? 5);
  const seed = layer.seed ?? 1;
  const ctx = p.drawingContext;

  ctx.save();
  for (let i = 0; i < Math.min(count, maxCount); i += 1) {
    const piece = makePiece(seed, i, colorCount);
    const pieceXK = layer.xExclude ? remapXExclude(piece.xK, layer.xExclude) : piece.xK;
    const xK = xRange[0] + (xRange[1] - xRange[0]) * pieceXK;
    const h = minH + (maxH - minH) * piece.heightK;
    const w = minW + (maxW - minW) * piece.widthK;
    const x = xK * p.width;
    const baseY = yKTuple
      ? yMin + (yMax - yMin) * ((piece.yJitter + 1) / 2)
      : yMin + piece.yJitter * Math.max(2, h * 0.18);
    const lean = piece.leanK * w * 0.8;
    const { color, alpha } = colorForLayer(layer, piece.colorIndex);

    ctx.globalAlpha = clamp01(alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, baseY);
    ctx.lineTo(x + w * 0.5, baseY);
    ctx.lineTo(x + lean, baseY - h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawFoliageLayer(args: {
  p: PLike;
  spec: FoliageSceneSpec;
  liveAvg: number;
  anchors?: BackgroundAnchorContext;
}) {
  const { p, spec, liveAvg, anchors } = args;
  for (const layer of spec.layers) {
    drawLayer({ p, layer, liveAvg, anchors });
  }
}
