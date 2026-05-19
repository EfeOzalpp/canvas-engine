import {
  BACKGROUNDS,
  type BackgroundAnchorContext,
  type BackgroundSpec,
  type LinearGradientSpec,
  type RadialGradientSpec,
} from "../../../adjustable-rules/backgrounds";
import type { SceneLookupKey } from "../../../adjustable-rules/sceneState";
import { stepAndDrawParticles } from "../../../modifiers/particles";
import { clamp01 } from "../../../shared/math";
import type { PLike } from "../../p/makeP";
import { backgroundAnchorCacheKey, resolveStopK, resolveStopKValue } from "./anchors";
import { parseCssColor, resolveStopColor } from "./color";
import { drawStars } from "./stars";
import { drawLinearStopSurface } from "./surface";

function resolveOuterRadius(p: PLike, outer: RadialGradientSpec["outer"]) {
  if (outer === "diag") return Math.hypot(p.width, p.height);
  return Math.max(1, outer.k) * Math.max(p.width, p.height);
}

function resolveLinearPoints(p: PLike, spec: LinearGradientSpec) {
  return {
    x1: p.width * spec.from.xK,
    y1: p.height * spec.from.yK,
    x2: p.width * spec.to.xK,
    y2: p.height * spec.to.yK,
  };
}

function resolveBackgroundSpec(
  sceneLookup: SceneLookupKey,
  override: BackgroundSpec | null
): BackgroundSpec {
  return override ?? BACKGROUNDS[sceneLookup];
}

export function drawFogOverlay(
  p: PLike,
  sceneLookup: SceneLookupKey,
  override: BackgroundSpec | null = null,
  alpha = 1,
  liveAvg = 0.5,
  anchors?: BackgroundAnchorContext
) {
  const spec = resolveBackgroundSpec(sceneLookup, override);
  const overlay = spec.overlay;
  if (!overlay || overlay.kind === "solid") return;

  const gradOverlay = overlay;
  const hasFog = gradOverlay.stops.some((s) => s.fog);
  if (!hasFog) return;

  const ctx = p.drawingContext;
  const t = p.millis() / 1000;

  type GradStop = (typeof gradOverlay.stops)[number];
  function fogStopColor(stop: GradStop): string {
    if (!stop.fog) return "rgba(0,0,0,0)";
    const resolved = resolveStopColor(stop.rgba, stop.liveBlend, liveAvg);
    const parsed = parseCssColor(resolved);
    if (!parsed) return "rgba(0,0,0,0)";
    return `rgba(${String(parsed.r)}, ${String(parsed.g)}, ${String(parsed.b)}, ${String(clamp01(stop.fog.opacity))})`;
  }

  let g: CanvasGradient;

  if (gradOverlay.kind === "linear") {
    const { x1, y1, x2, y2 } = resolveLinearPoints(p, gradOverlay);
    g = ctx.createLinearGradient(x1, y1, x2, y2);
    for (const stop of gradOverlay.stops) {
      const baseK = resolveStopK(stop, t, anchors);
      const fogK = stop.fog?.k != null
        ? resolveStopKValue(stop.fog.k, anchors)
        : baseK;
      g.addColorStop(fogK, fogStopColor(stop));
    }
  } else {
    const cx = p.width * gradOverlay.center.xK;
    const cy = p.height * gradOverlay.center.yK;
    const inner = Math.min(p.width, p.height) * gradOverlay.innerK;
    const outer = resolveOuterRadius(p, gradOverlay.outer);
    g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    for (const stop of gradOverlay.stops) {
      const fogK = stop.fog?.k != null
        ? resolveStopKValue(stop.fog.k, anchors)
        : resolveStopK(stop, t, anchors);
      g.addColorStop(fogK, fogStopColor(stop));
    }
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, p.width, p.height);
  ctx.restore();

  const dtSec = Math.min(0.1, p.deltaTime / 1000);

  for (let i = 0; i < gradOverlay.stops.length; i++) {
    const stop = gradOverlay.stops[i];
    if (!stop.fog || stop.fog.opacity <= 0) continue;

    const fogK = stop.fog.k != null
      ? resolveStopKValue(stop.fog.k, anchors)
      : resolveStopK(stop, t, anchors);
    const resolved = resolveStopColor(stop.rgba, stop.liveBlend, liveAvg);
    const parsed = parseCssColor(resolved);
    if (!parsed) continue;

    const bandH = p.height * 0.26;
    const centerY = fogK * p.height;

    stepAndDrawParticles(p, {
      key: `fog-foliage:${sceneLookup}:${String(i)}`,
      rect: { x: 0, y: centerY - bandH * 0.5, w: p.width, h: bandH },
      mode: "dot",
      spawnMode: "stratified",
      respawnStratified: true,
      count: Math.max(1, Math.round(stop.fog.opacity * 48)),
      color: { r: parsed.r, g: parsed.g, b: parsed.b, a: Math.round(stop.fog.opacity * 155) },
      speed: { min: 6, max: 20 },
      angle: { min: -0.28, max: 0.28 },
      accel: { y: 1.8 },
      jitter: { pos: 10, velAngle: 0.45 },
      size: { min: 0.9, max: 2.5 },
      lifetime: { min: 5, max: 13 },
      fadeInFrac: 0.12,
      fadeOutFrac: 0.22,
      edgeFadePx: {
        left: p.width * 0.09,
        right: p.width * 0.09,
        top: bandH * 0.32,
        bottom: bandH * 0.32,
      },
      respawn: true,
    }, dtSec);
  }
}

export function drawBackground(
  p: PLike,
  sceneLookup: SceneLookupKey,
  override: BackgroundSpec | null = null,
  alpha = 1,
  liveAvg = 0.5,
  skipStars = false,
  anchors?: BackgroundAnchorContext
) {
  const spec = resolveBackgroundSpec(sceneLookup, override);
  const ctx = p.drawingContext;

  if (alpha >= 1) {
    p.background(spec.base);
  } else {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = spec.base;
    ctx.fillRect(0, 0, p.width, p.height);
    ctx.restore();
  }

  const overlay = spec.overlay;
  if (overlay) {
    if (overlay.kind === "solid") {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = overlay.color;
      ctx.fillRect(0, 0, p.width, p.height);
      ctx.restore();
    } else if (overlay.kind === "linear") {
      const t = p.millis() / 1000;
      const needsSurfaceStops = overlay.stops.some((stop) =>
        !!stop.rightRgba || stop.blendFromPrevious === false || stop.blendToNext === false
      );
      const drewSurface = needsSurfaceStops
        ? drawLinearStopSurface(p, ctx, overlay, alpha, liveAvg, t, anchors)
        : false;

      if (!drewSurface) {
        const { x1, y1, x2, y2 } = resolveLinearPoints(p, overlay);
        const g = ctx.createLinearGradient(x1, y1, x2, y2);
        for (const stop of overlay.stops) {
          const k = resolveStopK(stop, t, anchors);
          g.addColorStop(k, resolveStopColor(stop.rgba, stop.liveBlend, liveAvg));
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, p.width, p.height);
        ctx.restore();
      }
    } else {
      const cx = p.width * overlay.center.xK;
      const cy = p.height * overlay.center.yK;
      const inner = Math.min(p.width, p.height) * overlay.innerK;
      const outer = resolveOuterRadius(p, overlay.outer);

      const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
      for (const stop of overlay.stops) {
        g.addColorStop(resolveStopK(stop, p.millis() / 1000, anchors), resolveStopColor(stop.rgba, stop.liveBlend, liveAvg));
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, p.width, p.height);
      ctx.restore();
    }
  }

  if (!skipStars && spec.stars) {
    ctx.save();
    ctx.globalAlpha = alpha;
    drawStars(p, ctx, spec.stars, liveAvg);
    ctx.restore();
  }
}

export function drawBackgroundStarsOnly(
  p: PLike,
  sceneLookup: SceneLookupKey,
  override: BackgroundSpec | null = null,
  alpha = 1,
  liveAvg = 0.5
) {
  const spec = resolveBackgroundSpec(sceneLookup, override);
  if (!spec.stars) return;
  const ctx = p.drawingContext;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawStars(p, ctx, spec.stars, liveAvg);
  ctx.restore();
}

// Offscreen cache for background base + overlay; stars stay live because they animate.
export function createBgCache() {
  let offscreen: HTMLCanvasElement | null = null;
  let cacheKey = "";
  let lastOverride: BackgroundSpec | null | undefined = undefined;

  return function drawBgCached(
    p: PLike,
    sceneLookup: SceneLookupKey,
    override: BackgroundSpec | null,
    liveAvg: number,
    anchors?: BackgroundAnchorContext
  ) {
    const w = p.width;
    const h = p.height;
    const liveAvgQ = Math.round(liveAvg * 100);
    const key = [
      String(w),
      String(h),
      sceneLookup,
      String(liveAvgQ),
      backgroundAnchorCacheKey(anchors),
    ].join("|");

    if (offscreen?.width !== w || offscreen.height !== h) {
      offscreen ??= document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      cacheKey = "";
    }

    if (key !== cacheKey || override !== lastOverride) {
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) throw new Error("2D canvas context not available");
      offCtx.clearRect(0, 0, w, h);
      const fakeP = {
        drawingContext: offCtx,
        width: w,
        height: h,
        millis: () => 0,
        background: (color: string) => {
          offCtx.fillStyle = color;
          offCtx.fillRect(0, 0, w, h);
        },
      } as unknown as PLike;
      drawBackground(fakeP, sceneLookup, override, 1, liveAvg, true, anchors);
      cacheKey = key;
      lastOverride = override;
    }

    const ctx = p.drawingContext;
    ctx.drawImage(offscreen, 0, 0);
  };
}
