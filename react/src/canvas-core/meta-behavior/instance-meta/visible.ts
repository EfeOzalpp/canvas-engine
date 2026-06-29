export function applyCanvasVisibility(canvas: HTMLCanvasElement, visible: boolean | undefined) {
  canvas.style.opacity = visible === false ? "0" : "1";
}
