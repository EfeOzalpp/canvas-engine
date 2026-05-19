// src/canvas-engine/adjustable-rules/canvas-padding/index.ts

import type { SceneLookupKey } from '../sceneState';
import type { DeviceType } from '../../shared/responsiveness';
import type { CanvasPaddingSpec } from './types';

export type { CanvasPaddingSpec } from './types';

import { START_PADDING }         from './start';
import { QUESTIONNAIRE_PADDING }          from './questionnaire';
import { CITY_PADDING }          from './city';

export const CANVAS_PADDING: Record<SceneLookupKey, Record<DeviceType, CanvasPaddingSpec | null>> = {
  start:         START_PADDING,
  city:          CITY_PADDING,
  questionnaire: QUESTIONNAIRE_PADDING,
};
