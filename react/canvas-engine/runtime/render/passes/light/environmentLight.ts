import { ENVIRONMENT_LIGHT_SHAPE } from "../../../../shapes";
import type { EngineFieldItem } from "../../../engine/field";
import type { EngineStyle } from "../../../engine/state";
import type { FogLightSource } from "../atmosphere/fog";

interface EnvironmentLightCacheState {
  itemsSource: EngineFieldItem[] | null;
  width: number;
  darkMode: boolean;
  styleSourceXK: number | null;
  source: FogLightSource | null;
}

export function createEnvironmentLightResolver() {
  const cache: EnvironmentLightCacheState = {
    itemsSource: null,
    width: 0,
    darkMode: false,
    styleSourceXK: null,
    source: null,
  };

  function parseHexColor(hex: string): FogLightSource["color"] | null {
    const normalized = hex.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
    const value = Number.parseInt(normalized, 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  }

  function environmentLightSourceFromStyle(style: EngineStyle): FogLightSource | null {
    const source = style.shapeLightSource;
    if (!source) return null;

    const metadata = ENVIRONMENT_LIGHT_SHAPE.sun;
    if (!metadata) return null;

    const colorHex = style.darkMode && metadata[2] ? metadata[2] : metadata[1];
    const color = parseHexColor(colorHex);
    if (!color) return null;

    return {
      xK: Math.max(0, Math.min(1, source.xK)),
      color,
    };
  }

  return function findEnvironmentLightSource(args: {
    items: EngineFieldItem[];
    width: number;
    style: EngineStyle;
  }): FogLightSource | null {
    const { items, style } = args;
    const width = Math.max(1, args.width);
    const styleSourceXK = style.shapeLightSource
      ? Math.max(0, Math.min(1, style.shapeLightSource.xK))
      : null;

    if (
      items === cache.itemsSource &&
      width === cache.width &&
      style.darkMode === cache.darkMode &&
      styleSourceXK === cache.styleSourceXK
    ) {
      return cache.source;
    }

    cache.itemsSource = items;
    cache.width = width;
    cache.darkMode = style.darkMode;
    cache.styleSourceXK = styleSourceXK;
    cache.source = null;

    for (const item of items) {
      const metadata = ENVIRONMENT_LIGHT_SHAPE[item.shape];
      if (!metadata) continue;
      const [, lightColorHex, darkColorHex] = metadata;
      const colorHex = style.darkMode && darkColorHex ? darkColorHex : lightColorHex;
      const color = parseHexColor(colorHex);
      if (!color) continue;
      cache.source = {
        xK: Math.max(0, Math.min(1, item.x / width)),
        color,
      };
      return cache.source;
    }

    cache.source = environmentLightSourceFromStyle(style);
    return cache.source;
  };
}
