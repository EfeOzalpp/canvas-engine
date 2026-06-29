import type { SceneLightContext } from "../../../../modifiers/lighting";
import { clamp01 } from "../../../../shared/math";
import { addAlphaOnlyLightStops } from "../shared/color";
import { resolveHorizonRow } from "../shared/horizon";
import type { GridMetrics } from "../../../geometry/gridCache";
import type { PLike } from "../../../p/makeP";

const SKY_LIGHT_INNER_RADIUS_K = 0.10;
const SKY_LIGHT_OUTER_RADIUS_K = 0.26;

export function drawRowTopLightOverlay(args: {
  p: PLike;
  metrics: GridMetrics;
  light: SceneLightContext | null;
  alpha?: number;
  compositeAlpha?: number;
  minRow?: number;
  maxRowExclusive?: number;
}) {
  const { p, metrics, light, alpha = 1, compositeAlpha = 1, minRow = 0, maxRowExclusive } = args;
  if (!light || alpha <= 0 || compositeAlpha <= 0) return;
  const { rowHeights, rowOffsetY } = metrics;
  if (rowHeights.length < 1 || rowOffsetY.length < 1) return;

  const ctx = p.drawingContext;
  const horizonRow = resolveHorizonRow(rowHeights);
  const maxBandH = Math.max(4, Math.min(18, p.height * 0.022));

  ctx.save();
  ctx.globalAlpha = alpha * compositeAlpha;

  const sourceKx = clamp01(light.sourceX / p.width);

  const firstRow = Math.max(0, Math.min(rowHeights.length, Math.floor(minRow)));
  const lastRow = Math.max(firstRow, Math.min(rowHeights.length, Math.floor(maxRowExclusive ?? rowHeights.length)));

  for (let r = firstRow; r < lastRow; r += 1) {
    const rowTop = rowOffsetY[r] ?? 0;
    const rowH = rowHeights[r] ?? 0;
    if (rowH <= 0) continue;

    const bandH = Math.max(2, Math.min(maxBandH, rowH * 0.16));
    const rowY = rowTop + bandH * 0.5;
    const distY = Math.abs(rowY - light.sourceY);
    const verticalK = clamp01(1 - distY / (p.height * 0.95));
    const skyK = r <= horizonRow
      ? 1
      : clamp01(1 - (r - horizonRow) / Math.max(3, rowHeights.length - horizonRow)) * 0.72;
    const bandAlpha = 0.27 * verticalK * skyK;
    if (bandAlpha <= 0.003) continue;

    const g = ctx.createLinearGradient(0, 0, p.width, 0);
    addAlphaOnlyLightStops(g, sourceKx, bandAlpha, SKY_LIGHT_INNER_RADIUS_K, SKY_LIGHT_OUTER_RADIUS_K, 0.45);

    ctx.fillStyle = g;
    ctx.fillRect(0, rowTop, p.width, bandH);
  }

  ctx.restore();
}
