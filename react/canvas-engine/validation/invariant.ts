// src/canvas-engine/validation/invariant.ts

export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    // keep message readable in console
    console.error(`Canvas Engine Validation Failed:\n${message}`);
    throw new Error(message);
  }
}

