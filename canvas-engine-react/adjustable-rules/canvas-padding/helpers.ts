// src/canvas-engine/adjustable-rules/canvas-padding/helpers.ts

import { makeRowForbidden } from '../../grid-layout/forbidden';

// Shorthand row specs used across all scenes
export const CENTER_100 = { center: '1010%' } as const;
export const LR_0       = { left: '0%', right: '0%' } as const;

export { makeRowForbidden };
