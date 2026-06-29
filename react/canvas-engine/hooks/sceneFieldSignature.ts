import type { Place } from "../grid-layout/occupancy";
import type { SceneLookupKey } from "../scene-state";
import type { SceneShapeLightSource } from "../scene-logic/shapeLightSource";

function reservedFootprintsKey(reservedFootprints: Place[] | undefined) {
  if (!reservedFootprints?.length) return "";
  return reservedFootprints
    .map((footprint) =>
      [footprint.r0, footprint.c0, footprint.w, footprint.h].map((value) => String(value)).join(",")
    )
    .join(";");
}

function lightSourceKey(shapeLightSource: SceneShapeLightSource | null | undefined) {
  if (shapeLightSource === undefined) return "authored";
  if (!shapeLightSource) return "none";
  return [
    shapeLightSource.xK,
    shapeLightSource.yK,
    shapeLightSource.paletteClosenessK ?? "",
  ].map((value) => String(value)).join(":");
}

export function fieldRefreshSignature(args: {
  hostId: string;
  sceneLookupKey: SceneLookupKey;
  viewportKey?: number | string;
  spotlightIndex?: number;
  fog?: boolean;
  darkMode: boolean;
  canvas: { w: number; h: number };
  reservedFootprints: Place[] | undefined;
  shapeLightSource: SceneShapeLightSource | null | undefined;
}) {
  return [
    args.hostId,
    args.sceneLookupKey,
    String(args.viewportKey ?? ""),
    String(args.spotlightIndex ?? ""),
    String(args.fog ?? ""),
    String(args.darkMode),
    `${String(args.canvas.w)}x${String(args.canvas.h)}`,
    reservedFootprintsKey(args.reservedFootprints),
    lightSourceKey(args.shapeLightSource),
  ].join("|");
}

