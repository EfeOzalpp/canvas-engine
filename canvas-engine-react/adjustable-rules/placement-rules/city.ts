// src/canvas-engine/adjustable-rules/placement-rules/city.ts

import type { PlacementZone, ScenePlacementRules } from "./types";

type V = [number, number];

const z = (v: V, h: V, m: number, t: number, l: number): PlacementZone =>
  ({ verticalK: v, horizontalK: h, count: { mobile: m, tablet: t, laptop: l } });

const FULL: V = [0, 1];
const SKY:  V = [0, 0.5];
const GND:  V = [0.5, 1];

export const CITY_PLACEMENTS: ScenePlacementRules = {
  sun:        { zones: [ z(SKY,  FULL,  1,  1,  1) ] },
  clouds:     { quota: [{ t: 0, pct: 20 }, { t: 1, pct: 80 }],
                zones: [ z(FULL, FULL,  4,  6,  8) ] },
  snow:       { quota: [{ t: 0, pct: 80 }, { t: 1, pct: 40 }],
                zones: [ z(FULL, FULL,  3,  4,  5) ] },
  villa:      { quota: [{ t: 0, pct: 75 }, { t: 1, pct: 50 }],
                zones: [ z(GND,  FULL,  6, 10, 14) ] },
  house:      { quota: [{ t: 0, pct: 25 }, { t: 1, pct: 100 }],
                zones: [ z(GND,  FULL,  4,  6, 10) ] },
  power:      { quota: [{ t: 0, pct: 30 }, { t: 1, pct: 90 }],
                zones: [ z(GND,  FULL,  2,  3,  4) ] },
  carFactory: { quota: [{ t: 0, pct:  5 }, { t: 1, pct: 20 }],
                zones: [ z(GND,  FULL,  1,  1,  2) ] },
  trees:      { quota: [{ t: 0, pct: 90 }, { t: 1, pct: 40 }],
                zones: [ z(GND,  FULL, 10, 18, 28) ] },
  bus:        { quota: [{ t: 0, pct: 40 }, { t: 1, pct: 20 }],
                zones: [ z(GND,  FULL,  1,  1,  2) ] },
  car:        { quota: [{ t: 0, pct: 20 }, { t: 1, pct: 100 }],
                zones: [ z(GND,  FULL,  2,  3,  5) ] },
  sea:        { zones: [ z(GND,  FULL,  1,  1,  2) ] },
};
