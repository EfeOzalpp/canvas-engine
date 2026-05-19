// src/canvas-engine/adjustable-rules/canvas-padding/city.ts

import type { CanvasPaddingSpec } from './types';
import type { DeviceType } from '../../shared/responsiveness';

export const CITY_PADDING: Record<DeviceType, CanvasPaddingSpec | null> = {
  mobile: {
    rows: 26,
    useTopRatio: 1,
    horizonPos: 0.5,
  },

  tablet: {
    rows: 17,
    useTopRatio: 1,
    horizonPos: 0.55,
  },

  laptop: {
    rows: 19,
    useTopRatio: 1,
    horizonPos: 0.55,
  },
};
