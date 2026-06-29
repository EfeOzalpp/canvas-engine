import { useEffect, useRef, useState } from "react";

import { getCanvasMeta } from "../runtime/p/canvasMeta";
import { getViewportSize } from "../shared/responsiveness";
import type { useCanvasEngine } from "./useCanvasEngine";

type Engine = ReturnType<typeof useCanvasEngine>;

export function getCanvasLogicalSize(canvas: HTMLCanvasElement | undefined | null) {
  if (!canvas) {
    const { w, h } = getViewportSize();
    return { w, h };
  }

  // Runtime stores logical canvas size in WeakMap metadata instead of custom DOM fields.
  const meta = getCanvasMeta(canvas);
  const dpr =
    meta.dpr ??
    (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);

  const backingW = (canvas.width || 0) / dpr;
  const backingH = (canvas.height || 0) / dpr;

  const { cssW, cssH } = meta;

  const w =
    typeof cssW === "number" && Number.isFinite(cssW) ? cssW : backingW;
  const h =
    typeof cssH === "number" && Number.isFinite(cssH) ? cssH : backingH;

  return { w: Math.round(w), h: Math.round(h) };
}

export function useCanvasLogicalSizeTick(engine: Engine) {
  const { ready, controls, readyTick } = engine;
  const [canvasResizeTick, setCanvasResizeTick] = useState(0);
  const lastCanvasSizeRef = useRef<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!ready.current) return;

    const engineControls = controls.current;
    const canvas = engineControls?.canvas;
    if (!canvas) return;

    let rafId: number | null = null;
    const bump = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const next = getCanvasLogicalSize(canvas);
        const prev = lastCanvasSizeRef.current;
        if (prev && Math.abs(next.w - prev.w) <= 1 && Math.abs(next.h - prev.h) <= 1) {
          return;
        }
        lastCanvasSizeRef.current = next;
        setCanvasResizeTick((t) => t + 1);
      });
    };

    lastCanvasSizeRef.current = getCanvasLogicalSize(canvas);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        bump();
      });
      ro.observe(canvas);
    }

    // Keep a fallback in case a browser misses an observer event.
    const onWindowResize = () => {
      bump();
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onWindowResize);
      ro?.disconnect();
    };
  }, [ready, controls, readyTick]);

  return canvasResizeTick;
}
