// Gradient sampling for live average tinting and scene color ramps.

import type { RGB, Stop } from "./utils";
import { clamp01 } from "./utils";
import { mixRGB } from "./colorspace";

function rgbToCss(c: RGB): string {
  return `rgb(${String(c.r)}, ${String(c.g)}, ${String(c.b)})`;
}

// Linear sRGB on purpose; this matches the older getAvgColor tint behavior.
export function gradientColor(stops: Stop[], tRaw: number): { rgb: RGB; css: string; t: number } {
  const t = clamp01(tRaw);

  if (stops.length === 0) {
    const rgb = { r: 127, g: 127, b: 127 };
    return { rgb, css: rgbToCss(rgb), t };
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (t >= s1.stop && t <= s2.stop) {
      const span = Math.max(1e-6, s2.stop - s1.stop);
      const lt = (t - s1.stop) / span;
      const rgb = mixRGB(s1.color, s2.color, lt); // linear
      return { rgb, css: rgbToCss(rgb), t };
    }
  }

  const end = t <= stops[0].stop ? stops[0].color : stops[stops.length - 1].color;
  return { rgb: end, css: rgbToCss(end), t };
}
