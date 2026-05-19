// Palette fogging. Walks a palette object and pushes every RGB leaf toward the scene haze color.

import type { RGB } from "./utils";

function isRGB(v: unknown): v is RGB {
  if (!v || typeof v !== "object") return false;
  const maybe = v as Record<string, unknown>;
  return (
    typeof maybe.r === "number" &&
    typeof maybe.g === "number" &&
    typeof maybe.b === "number"
  );
}

function fogifyValue(v: unknown, t: number, haze: RGB): unknown {
  if (isRGB(v)) {
    return {
      r: Math.round(v.r + (haze.r - v.r) * t),
      g: Math.round(v.g + (haze.g - v.g) * t),
      b: Math.round(v.b + (haze.b - v.b) * t),
    };
  }
  if (Array.isArray(v)) return v.map((item) => fogifyValue(item, t, haze));
  if (v && typeof v === "object") {
    const result: Record<string, unknown> = {};
    const paletteBranch = v as Record<string, unknown>;
    for (const key of Object.keys(paletteBranch)) {
      result[key] = fogifyValue(paletteBranch[key], t, haze);
    }
    return result;
  }
  return v;
}

// Returns the original palette untouched when there is no fog.
export function fogifyPalette(palette: unknown, fogK: number, darkMode: boolean): unknown {
  if (!palette || fogK <= 0) return palette;
  const haze: RGB = darkMode
    ? { r: 79, g: 84, b: 111 } // ~horizon band of dark start background (#4f546f)
    : { r: 229, g: 246, b: 255 }; // base background color of start scene
  return fogifyValue(palette, fogK, haze);
}
