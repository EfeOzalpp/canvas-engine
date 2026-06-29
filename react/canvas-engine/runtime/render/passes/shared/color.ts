// src/canvas-engine/runtime/render/passes/shared/color.ts

// Color helpers used by more than one render pass. Background gradients,
// star ranges, and row light overlays all depend on this, so it intentionally
// stays outside background/atmosphere/light.
import { gradientColor, VIVID_COLOR_STOPS } from "../../../../modifiers/index";
import { clamp01, mixRgb } from "../../../../shared/math";

export interface RGBA { r: number; g: number; b: number; a: number }

export function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeBlendTaper(t: number) {
  const x = clamp01(t);
  return x * x * x;
}

export function mixRgba(a: RGBA, b: RGBA, t: number): RGBA {
  const k = clamp01(t);
  return {
    r: mix(a.r, b.r, k),
    g: mix(a.g, b.g, k),
    b: mix(a.b, b.b, k),
    a: mix(a.a, b.a, k),
  };
}

export function cssRgba(color: RGBA) {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `rgba(${String(channel(color.r))}, ${String(channel(color.g))}, ${String(channel(color.b))}, ${String(clamp01(color.a))})`;
}

export function parseCssColor(input: string): RGBA | null {
  const value = input.trim();

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    return null;
  }

  const rgbaMatch = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (!rgbaMatch) return null;

  const parts = rgbaMatch[1].split(",").map((part) => part.trim());
  if (parts.length < 3) return null;

  return {
    r: Number(parts[0]),
    g: Number(parts[1]),
    b: Number(parts[2]),
    a: parts.length < 4 ? 1 : Number(parts[3]),
  };
}

export function addAlphaOnlyLightStops(
  gradient: CanvasGradient,
  sourceKx: number,
  peakAlpha: number,
  innerRadiusK: number,
  outerRadiusK: number,
  innerPeakK = 0.42
) {
  const rawStops: (readonly [number, number])[] = [
    [0, 0],
    [sourceKx - outerRadiusK, 0],
    [sourceKx - innerRadiusK, peakAlpha * innerPeakK],
    [sourceKx, peakAlpha],
    [sourceKx + innerRadiusK, peakAlpha * innerPeakK],
    [sourceKx + outerRadiusK, 0],
    [1, 0],
  ];
  const stops: [number, number][] = [];

  for (const [rawK, rawAlpha] of rawStops) {
    const k = clamp01(rawK);
    const alpha = clamp01(rawAlpha);
    const existing = stops.find((s) => Math.abs(s[0] - k) < 0.0001);
    if (existing) {
      existing[1] = Math.max(existing[1], alpha);
    } else {
      stops.push([k, alpha]);
    }
  }

  stops.sort((a, b) => a[0] - b[0]);
  for (const [k, alpha] of stops) {
    gradient.addColorStop(k, `rgba(255,255,255,${String(alpha)})`);
  }
}

export function resolveStopColor(
  rgba: string,
  liveBlend: number | readonly [number, number] | undefined,
  liveAvg: number
) {
  if (!liveBlend) return rgba;

  const parsed = parseCssColor(rgba);
  if (!parsed) return rgba;

  const blendAmount: number = typeof liveBlend === "number"
    ? liveBlend
    : mix(liveBlend[0], liveBlend[1], easeBlendTaper(liveAvg));
  const tint = gradientColor(VIVID_COLOR_STOPS, liveAvg).rgb;
  const mixed = mixRgb(parsed, tint, blendAmount);
  return `rgba(${String(mixed.r)}, ${String(mixed.g)}, ${String(mixed.b)}, ${String(parsed.a)})`;
}
