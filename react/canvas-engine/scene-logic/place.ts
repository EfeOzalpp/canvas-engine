// src/canvas-engine/scene-logic/place.ts

import { createOccupancy } from "../grid-layout/occupancy";
import { cellAnchorToPx2 } from "../grid-layout/coords";
import type { GridMetrics } from "../grid-layout/gridMetrics";
import type { DeviceType } from "../shared/responsiveness";
import type { CanvasPaddingSpec } from "../scene-rules/canvas-padding";
import type { ScenePlacementRules } from "../scene-rules/placement-rules/index";
import type { PoolItem, PlacedItem, FootRect } from "./types";
import { buildFallbackCells } from "./candidates";
import { cellForbiddenFromSpec, allowedSegmentsForRow, footprintAllowed, horizontalReferenceForFootprint } from "./constraints";
import { scoreCandidateGeneric } from "./scoring";

function clampZoneCenterRowForFootprint(
  centerRow: number,
  hCell: number,
  usedRows: number
) {
  const minCenter = hCell / 2;
  const maxCenter = Math.max(minCenter, usedRows - hCell / 2);
  return Math.max(minCenter, Math.min(maxCenter, centerRow));
}

function communityBandRowBounds(
  band: NonNullable<PoolItem["communityZone"]>["band"],
  spec: CanvasPaddingSpec,
  usedRows: number,
  hCell: number
) {
  const maxR0 = Math.max(0, usedRows - hCell);
  if (typeof spec.horizonPos !== "number") {
    return { minR0: 0, maxR0 };
  }

  // Mirror computeHorizonRowHeights: rows split evenly (floor(n/2)), not by horizonPos fraction.
  // Using horizonPos * usedRows misplaces the sky/ground boundary when horizonPos != 0.5.
  const halfRows = Math.floor(usedRows / 2);
  const topRows = usedRows % 2 === 0
    ? halfRows
    : (spec.horizonPos >= 0.5 ? halfRows + 1 : halfRows);

  if (band === "sky") {
    return {
      minR0: 0,
      maxR0: Math.max(0, Math.min(maxR0, topRows - hCell)),
    };
  }

  return {
    minR0: Math.max(0, Math.min(maxR0, topRows)),
    maxR0,
  };
}

function communityBandBottomRowBounds(
  band: NonNullable<PoolItem["communityZone"]>["band"],
  spec: CanvasPaddingSpec,
  usedRows: number,
  hCell: number
) {
  if (typeof spec.horizonPos !== "number") {
    return {
      minBottomR: Math.max(0, hCell - 1),
      maxBottomR: Math.max(0, usedRows - 1),
    };
  }

  const halfRows = Math.floor(usedRows / 2);
  const topRows = usedRows % 2 === 0
    ? halfRows
    : (spec.horizonPos >= 0.5 ? halfRows + 1 : halfRows);

  if (band === "sky") {
    return {
      minBottomR: Math.max(0, hCell - 1),
      maxBottomR: Math.max(0, topRows - 1),
    };
  }

  return {
    minBottomR: Math.max(0, Math.min(usedRows - 1, topRows)),
    maxBottomR: Math.max(0, usedRows - 1),
  };
}

function zoneCenterRowForSpec(args: {
  band: NonNullable<PoolItem["communityZone"]>["band"];
  yK: number;
  spec: CanvasPaddingSpec;
  usedRows: number;
  hCell: number;
}) {
  const { band, yK, spec, usedRows, hCell } = args;
  const clampedY = Math.max(0, Math.min(1, yK));
  const rowSpan = Math.max(1, usedRows - 1);

  if (typeof spec.horizonPos !== "number") {
    return clampedY * rowSpan;
  }

  if (band === "ground") {
    const horizon = Math.max(0, Math.min(1, spec.horizonPos));
    return (horizon + clampedY * (1 - horizon)) * rowSpan;
  }

  const { minR0, maxR0 } = communityBandRowBounds(band, spec, usedRows, hCell);
  const minCenter = minR0 + hCell / 2;
  const maxCenter = maxR0 + hCell / 2;
  return minCenter + (maxCenter - minCenter) * clampedY;
}

function clampRow(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isThinRowZone(zone: NonNullable<PoolItem["communityZone"]>) {
  return zone.radiusY > 0 && zone.radiusY < 1;
}

function thinRowR0ForZone(args: {
  band: NonNullable<PoolItem["communityZone"]>["band"];
  centerRow: number;
  spec: CanvasPaddingSpec;
  usedRows: number;
  hCell: number;
}) {
  const { band, centerRow, spec, usedRows, hCell } = args;
  const { minBottomR, maxBottomR } = communityBandBottomRowBounds(band, spec, usedRows, hCell);
  const bottomR = clampRow(Math.round(centerRow), minBottomR, maxBottomR);
  return clampRow(bottomR - hCell + 1, 0, Math.max(0, usedRows - hCell));
}

function candidateInCommunityZone(args: {
  item: PoolItem;
  r0: number;
  c0: number;
  wCell: number;
  hCell: number;
  usedRows: number;
  refCols: number;
  spec: CanvasPaddingSpec;
}) {
  const { item, r0, c0, wCell, hCell, usedRows, refCols, spec } = args;
  const zone = item.communityZone;
  if (!zone) return false;

  if (isThinRowZone(zone)) {
    const { minBottomR, maxBottomR } = communityBandBottomRowBounds(zone.band, spec, usedRows, hCell);
    const bottomR = r0 + hCell - 1;
    if (bottomR < minBottomR || bottomR > maxBottomR) return false;
  } else {
    const { minR0, maxR0 } = communityBandRowBounds(zone.band, spec, usedRows, hCell);
    if (r0 < minR0 || r0 > maxR0) return false;
  }

  const rawCenterRow = zoneCenterRowForSpec({
    band: zone.band,
    yK: zone.centerY,
    spec,
    usedRows,
    hCell,
  });
  const centerRow = clampZoneCenterRowForFootprint(rawCenterRow, hCell, usedRows);
  const centerCol = zone.centerX * Math.max(1, refCols - 1);
  const itemRow = r0 + hCell / 2;
  const itemCol = c0 + wCell / 2;
  const radiusY = Math.max(0.5, zone.radiusY);
  const radiusX = Math.max(0.5, zone.radiusX);
  const dx = (itemCol - centerCol) / radiusX;

  if (isThinRowZone(zone)) {
    return Math.abs(dx) <= 1;
  }

  const dy = (itemRow - centerRow) / radiusY;

  if (zone.radiusShape === "rect") {
    return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
  }

  return dx * dx + dy * dy <= 1;
}

export function placePoolItems(opts: {
  pool: PoolItem[];
  spec: CanvasPaddingSpec;
  device: DeviceType;
  rows: number;
  cols: number;
  cell: number;
  cellW: number;
  cellH: number;
  ox?: number;
  oy?: number;
  metrics?: GridMetrics;
  canvas: { w: number; h: number };
  usedRows: number;
  salt: number;
  placements: ScenePlacementRules;
  reservedFootprints?: FootRect[];
}): { placed: PlacedItem[] } {
  const {
    pool,
    spec,
    rows,
    cols,
    cellW,
    cellH,
    ox,
    oy,
    usedRows,
    salt,
    placements,
    metrics,
    canvas,
    reservedFootprints = [],
  } = opts;

  const { colsPerRow } = metrics ?? {};

  const isForbidden = cellForbiddenFromSpec(spec, rows, cols, colsPerRow);
  const occ = createOccupancy(rows, cols, (r, c) => isForbidden(r, c), colsPerRow);
  const occClouds = createOccupancy(rows, cols, undefined, colsPerRow);
  const fallbackCells = buildFallbackCells(rows, cols, spec);

  for (const reserved of reservedFootprints) {
    occ.tryPlaceAt(reserved.r0, reserved.c0, reserved.w, reserved.h);
  }

  const placedFootprints: FootRect[] = [];
  const emptyPlacedFootprints: FootRect[] = [];
  const outPlaced: PlacedItem[] = [];
  let cursor = 0;

  for (const item of pool) {
    const { shape, size } = item;
    const wCell = size.w;
    const hCell = size.h;
    const ignoreForbidden = shape === "clouds";
    const itemForbidden = ignoreForbidden ? (() => false) : isForbidden;
    const targetOcc = shape === "clouds" ? occClouds : occ;

    if (item.point) {
      const rawR0 = Math.max(0, Math.round((usedRows - hCell) * item.point.yK));
      const boundedR0 = Math.max(0, Math.min(rows - hCell, rawR0));
      const { refCols } = horizontalReferenceForFootprint(boundedR0, hCell, cols, colsPerRow);
      const rawC0 = Math.max(0, Math.round((refCols - wCell) * item.point.xK));
      const boundedC0 = Math.max(0, Math.min(refCols - wCell, rawC0));
      const rectHit = targetOcc.tryPlaceAt(boundedR0, boundedC0, wCell, hCell);

      if (!rectHit) continue;

      const { x, y } = cellAnchorToPx2(
        { cellW, cellH, ox, oy, ...metrics },
        rectHit,
        "center"
      );

      item.footprint = rectHit;
      item.x = x;
      item.y = y;

      if (shape !== "clouds") {
        placedFootprints.push(rectHit);
      }

      outPlaced.push({ id: item.id, x, y, shape: item.shape, footprint: rectHit });
      continue;
    }

    if (item.center) {
      const rectW = Math.max(1, wCell * cellW * item.center.scale);
      const rectH = Math.max(1, hCell * cellH * item.center.scale);
      const rectX = canvas.w * item.center.xK - rectW / 2;
      const rectY = canvas.h * item.center.yK - rectH / 2;
      const centerX = rectX + rectW / 2;
      const centerY = rectY + rectH / 2;
      const rectHit: FootRect = {
        r0: Math.max(0, Math.round((usedRows - hCell) * item.center.yK)),
        c0: Math.max(0, Math.round((cols - wCell) * item.center.xK)),
        w: wCell,
        h: hCell,
      };
      const reservedHit = targetOcc.tryPlaceAt(rectHit.r0, rectHit.c0, rectHit.w, rectHit.h) ?? rectHit;

      item.footprint = reservedHit;
      item.pixelFootprint = { x: rectX, y: rectY, w: rectW, h: rectH };
      item.x = centerX;
      item.y = centerY;

      if (shape !== "clouds") {
        placedFootprints.push(reservedHit);
      }

      outPlaced.push({
        id: item.id,
        x: centerX,
        y: centerY,
        shape: item.shape,
        footprint: reservedHit,
        pixelFootprint: item.pixelFootprint,
      });
      continue;
    }

    const placedForScore = shape === "clouds" ? emptyPlacedFootprints : placedFootprints;

    const candidates: { r0: number; c0: number; score: number }[] = [];

    if (item.communityZone) {
      const { minR0: bandMinR0, maxR0: bandMaxR0 } = communityBandRowBounds(
        item.communityZone.band,
        spec,
        usedRows,
        hCell
      );
      const rawCenterRow = zoneCenterRowForSpec({
        band: item.communityZone.band,
        yK: item.communityZone.centerY,
        spec,
        usedRows,
        hCell,
      });
      const centerRow = clampZoneCenterRowForFootprint(rawCenterRow, hCell, usedRows);
      const thinRowR0 = isThinRowZone(item.communityZone)
        ? thinRowR0ForZone({
            band: item.communityZone.band,
            centerRow,
            spec,
            usedRows,
            hCell,
          })
        : null;
      const rMin = thinRowR0 ?? Math.max(bandMinR0, Math.floor(centerRow - item.communityZone.radiusY - hCell));
      const rMax = thinRowR0 ?? Math.min(
        bandMaxR0,
        Math.ceil(centerRow + item.communityZone.radiusY)
      );

      for (let r0 = rMin; r0 <= Math.min(rMax, rows - hCell); r0++) {
        const { refCols } = horizontalReferenceForFootprint(r0, hCell, cols, colsPerRow);
        const centerCol = item.communityZone.centerX * Math.max(1, refCols - 1);
        const cMin = Math.max(0, Math.floor(centerCol - item.communityZone.radiusX - wCell));
        const cMax = Math.min(refCols - wCell, Math.ceil(centerCol + item.communityZone.radiusX));
        const segs = allowedSegmentsForRow(r0, wCell, hCell, rows, cols, itemForbidden, colsPerRow);

        for (const seg of segs) {
          const c0Start = Math.max(seg.cStart, cMin);
          const c0End = Math.min(seg.cEnd, cMax);
          const effectiveCenterC = centerCol;

          for (let c0 = c0Start; c0 <= c0End; c0++) {
            if (!candidateInCommunityZone({
              item,
              r0,
              c0,
              wCell,
              hCell,
              usedRows,
              refCols,
              spec,
            })) {
              continue;
            }

            const score = scoreCandidateGeneric({
              r0, c0, wCell, hCell, cols, usedRows,
              placed: placedForScore,
              salt,
              effectiveCenterC,
              effectiveCenterR: centerRow,
            });
            candidates.push({ r0, c0, score });
          }
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      let rectHit: FootRect | null = null;
      for (const cand of candidates) {
        const hit = targetOcc.tryPlaceAt(cand.r0, cand.c0, wCell, hCell);
        if (hit) { rectHit = hit; break; }
      }

      if (!rectHit) continue;

      const { x, y } = cellAnchorToPx2(
        { cellW, cellH, ox, oy, ...metrics },
        rectHit,
        "center"
      );

      item.footprint = rectHit;
      item.x = x;
      item.y = y;

      if (shape !== "clouds") {
        placedFootprints.push(rectHit);
      }
      outPlaced.push({ id: item.id, x, y, shape: item.shape, footprint: rectHit });
      continue;
    }

    // Resolve zone bounds for this item
    const zone = typeof item.zoneIndex === "number"
      ? placements[shape]?.zones?.[item.zoneIndex]
      : undefined;
    const topK   = zone?.verticalK[0]    ?? 0;
    const botK   = zone?.verticalK[1]    ?? 1;
    const leftK  = zone?.horizontalK?.[0] ?? 0;
    const rightK = zone?.horizontalK?.[1] ?? 1;

    const rMin = Math.max(0, Math.floor(usedRows * topK));
    const rMax = Math.min(usedRows - hCell, Math.floor(usedRows * botK));

    for (let r0 = rMin; r0 <= Math.min(rMax, rows - hCell); r0++) {
      const { refCols } = horizontalReferenceForFootprint(r0, hCell, cols, colsPerRow);
      const cMin = Math.max(0, Math.floor(refCols * leftK));
      const cMax = Math.min(refCols - wCell, Math.floor(refCols * rightK));

      const segs = allowedSegmentsForRow(r0, wCell, hCell, rows, cols, itemForbidden, colsPerRow);

      for (const seg of segs) {
        const c0Start = Math.max(seg.cStart, cMin);
        const c0End   = Math.min(seg.cEnd,   cMax);
        // Score relative to the zone's own center, not the full segment center.
        // This prevents edge zones from being penalized for being far from grid center.
        const effectiveCenterC = (c0Start + c0End) / 2;

        for (let c0 = c0Start; c0 <= c0End; c0++) {
          const score = scoreCandidateGeneric({
            r0, c0, wCell, hCell, cols, usedRows,
            placed: placedForScore,
            salt,
            effectiveCenterC,
          });
          candidates.push({ r0, c0, score });
        }
      }
    }

    let rectHit: FootRect | null = null;

    if (candidates.length === 0) {
      for (let k = cursor; k < fallbackCells.length; k++) {
        const { r, c } = fallbackCells[k];
        if (r < rMin || r > rMax) continue;
        const { refCols: fbRefCols } = horizontalReferenceForFootprint(r, hCell, cols, colsPerRow);
        const fbCMin = Math.max(0, Math.floor(fbRefCols * leftK));
        const fbCMax = Math.min(fbRefCols - wCell, Math.floor(fbRefCols * rightK));
        if (c < fbCMin || c > fbCMax) continue;
        if (!footprintAllowed(r, c, wCell, hCell, rows, cols, itemForbidden, colsPerRow)) continue;
        const hit = targetOcc.tryPlaceAt(r, c, wCell, hCell);
        if (hit) {
          rectHit = hit;
          cursor = Math.max(k - 2, 0);
          break;
        }
      }
    } else {
      candidates.sort((a, b) => b.score - a.score);
      for (const cand of candidates) {
        const hit = targetOcc.tryPlaceAt(cand.r0, cand.c0, wCell, hCell);
        if (hit) { rectHit = hit; break; }
      }
    }

    if (!rectHit) continue;

    const { x, y } = cellAnchorToPx2(
      { cellW, cellH, ox, oy, ...metrics },
      rectHit,
      "center"
    );

    item.footprint = rectHit;
    item.x = x;
    item.y = y;

    if (shape !== "clouds") {
      placedFootprints.push(rectHit);
    }
    outPlaced.push({ id: item.id, x, y, shape: item.shape, footprint: rectHit });
  }

  return { placed: outPlaced };
}
