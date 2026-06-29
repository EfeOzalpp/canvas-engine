import type { RenderApi } from "../render-api";
import { parseCssColor } from "../modifiers/color";
import { resolveStops } from "./core";
import type { AnchorContext, BackgroundSpec } from "./core";

export function drawBackground(api: RenderApi, spec: BackgroundSpec, anchors: AnchorContext): void {
  const { cssWidth: w, cssHeight: h } = api.surface;
  const base = parseCssColor(spec.base);
  api.drawShape({ x: 0, y: 0, w, h, color: { r: base[0], g: base[1], b: base[2], a: base[3] }, kind: "rect" });

  if (spec.overlay?.kind === "linear") {
    const resolved = resolveStops(spec.overlay.stops, anchors);
    api.drawLinearGradient({
      stops: resolved.map((s) => ({
        position: s.position,
        rgba: parseCssColor(s.rgba),
        holdToNext: s.holdToNext,
      })),
    });
  }
}