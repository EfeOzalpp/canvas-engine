// src/canvas-engine/scene-rules/canvas-padding/city.ts

import type { CanvasPaddingSpec } from './types';
import type { DeviceType } from '../../shared/responsiveness';

export const CITY_PADDING: Record<DeviceType, CanvasPaddingSpec | null> = {
  mobile: {
    rows: 28,
    useTopRatio: 1,
    horizonPos: 0.45,
  },

  tablet: {
    rows: 26,
    useTopRatio: 1,
    horizonPos: 0.45,
  },

  laptop: {
    rows: 24,
    useTopRatio: 1,
    horizonPos: 0.45,
  },
};
