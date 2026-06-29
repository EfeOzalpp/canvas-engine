import type { OffscreenHandle } from "../../../../../render-api";
import { registerCacheStrategy } from "../../cache-registry";

registerCacheStrategy("fbo", (_canvasId, offscreen) => {
  if (!offscreen) return undefined;

  let target: OffscreenHandle | null = null;
  let targetW = 0;
  let targetH = 0;

  return {
    cleanup() {
      if (target) { offscreen.destroy(target); target = null; }
    },
    beginRender(surface) {
      if (target && (targetW !== surface.pixelWidth || targetH !== surface.pixelHeight)) {
        offscreen.destroy(target);
        target = null;
      }
      if (!target) {
        target = offscreen.create(surface.pixelWidth, surface.pixelHeight);
        targetW = surface.pixelWidth;
        targetH = surface.pixelHeight;
      }
      if (target) offscreen.bind(target);
    },
    endRender() {
      offscreen.unbind();
    },
    blit() {
      if (target) offscreen.blit(target);
    },
  };
});
