export function applyZIndex(canvas: HTMLCanvasElement, zIndex: number) {
  canvas.style.position = "relative";
  canvas.style.zIndex = String(zIndex);
}
