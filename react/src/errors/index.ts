const VALID_CANVAS_ID = /^[a-zA-Z0-9_-]+$/;

export function assertValidCanvasId(id: string): void {
  if (!VALID_CANVAS_ID.test(id)) {
    throw new Error(
      `[canvas-engine] Invalid canvas id "${id}". ` +
      `Canvas ids must contain only letters, numbers, hyphens, or underscores ` +
      `so they can be used as config filenames.`
    );
  }
}