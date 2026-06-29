import type { PLike } from "../p/makeP";
import { normalizeDprTransform } from "../util/transform";

export function clearSceneSurfaceToUnderpaint(p: PLike) {
  const ctx = p.drawingContext;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
  ctx.restore();
  normalizeDprTransform(p);
}
