const openCanvasIds = new Set<string>();

export function markCanvasOpen(id: string, closes: readonly string[] | undefined) {
  for (const closeId of closes ?? []) {
    openCanvasIds.delete(closeId);
  }

  openCanvasIds.add(id);
}

export function markCanvasClosed(id: string) {
  openCanvasIds.delete(id);
}

export function isCanvasMarkedOpen(id: string): boolean {
  return openCanvasIds.has(id);
}
