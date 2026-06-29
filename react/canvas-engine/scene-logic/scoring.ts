// src/canvas-engine/scene-logic/scoring.ts

import { rand01Keyed } from "../shared/hash32";

interface PlacedFoot {
  r0: number;
  c0: number;
  w: number;
  h: number;
}

function centerOf(f: { r0: number; c0: number; w: number; h: number }) {
  return { x: f.c0 + f.w / 2, y: f.r0 + f.h / 2 };
}

export function scoreCandidateGeneric(opts: {
  r0: number;
  c0: number;
  wCell: number;
  hCell: number;
  cols: number;
  usedRows: number;
  placed: PlacedFoot[];
  salt: number;

  // center of the allowed segment this candidate belongs to (overrides full-grid center)
  effectiveCenterC?: number;
  effectiveCenterR?: number;
}) {
  const {
    r0,
    c0,
    wCell,
    hCell,
    cols,
    usedRows,
    placed,
    salt,
    effectiveCenterC,
    effectiveCenterR,
  } = opts;

  const { x: cx, y: cy } = centerOf({ r0, c0, w: wCell, h: hCell });

  // prefer center of the available zone, fall back to full-grid center
  const gridCx = effectiveCenterC ?? (cols - 1) / 2;
  const usedCy = effectiveCenterR ?? (usedRows - 1) / 2;
  const dCenter2 = (cx - gridCx) ** 2 + (cy - usedCy) ** 2;
  const centerTerm = -0.08 * dCenter2;

  // spread - prefer positions far from the nearest already-placed shape
  let spreadTerm = 0;
  if (placed.length > 0) {
    let minDist2 = Infinity;
    for (const p of placed) {
      const pc = centerOf(p);
      const d2 = (cx - pc.x) ** 2 + (cy - pc.y) ** 2;
      if (d2 < minDist2) minDist2 = d2;
    }
    spreadTerm = 0.10 * Math.min(minDist2, 36);
  }

  // deterministic jitter
  const jitter =
    (rand01Keyed(
      `cand|${String(r0)},${String(c0)},${String(wCell)},${String(hCell)}|${String(salt)}`
    ) - 0.5) * 0.25;

  return centerTerm + spreadTerm + jitter;
}
