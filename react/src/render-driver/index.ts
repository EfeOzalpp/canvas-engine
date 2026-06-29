import { parseCssColor } from "../modifiers/color";
import type { RenderDriverInput } from "./types";

export function driveRender({ api, shapes }: RenderDriverInput): void {
  for (const { shape, frame } of shapes) {
    const leftEdge = frame.x - frame.cellW / 2;

    for (const layer of shape.layers) {
      const geo = layer.geometry;
      if (geo?.kind !== "rectangle") continue;

      const vertices = Object.values(geo.points);
      if (vertices.length === 0) continue;

      const xs = vertices.map(v => v.x);
      const ys = vertices.map(v => v.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const x = leftEdge + minX * frame.cellW;
      const y = frame.y - maxY * frame.cellH;
      const w = (maxX - minX) * frame.cellW;
      const h = (maxY - minY) * frame.cellH;

      const [r, g, b, a] = layer.color ? parseCssColor(layer.color) : [1, 1, 1, 1];

      api.drawShape({ x, y, w, h, color: { r, g, b, a }, kind: "rect" });
    }
  }
}

export type { RenderDriverInput } from "./types";
