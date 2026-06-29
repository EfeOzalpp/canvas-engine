// src/canvas-engine/hooks/useViewportKey.ts
import { useEffect, useRef, useState } from 'react';

const MOBILE_CHROME_HEIGHT_DELTA_PX = 300;

function readViewportSize() {
  const vv = window.visualViewport;
  if (vv?.width && vv.height) {
    return { w: Math.round(vv.width), h: Math.round(vv.height) };
  }
  return {
    w: Math.round(window.innerWidth || document.documentElement.clientWidth || 0),
    h: Math.round(window.innerHeight || document.documentElement.clientHeight || 0),
  };
}

export function useViewportKey(delay = 120) {
  const [key, setKey] = useState(0);
  const tRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tick = () => {
      setKey((k) => k + 1);
    };

    const scheduleTick = () => {
      if (tRef.current != null) window.clearTimeout(tRef.current);
      tRef.current = window.setTimeout(tick, delay);
    };

    const onResize = () => {
      const next = readViewportSize();
      const prev = lastSizeRef.current;
      lastSizeRef.current = next;

      if (!prev) {
        scheduleTick();
        return;
      }

      const dw = Math.abs(next.w - prev.w);
      const dh = Math.abs(next.h - prev.h);

      // Ignore mobile browser UI expand/collapse drift unless the height jump is
      // large enough to represent a real layout change.
      if (dw <= 1 && dh > 0 && dh < MOBILE_CHROME_HEIGHT_DELTA_PX) return;

      scheduleTick();
    };

    const onOrientationChange = () => {
      lastSizeRef.current = readViewportSize();
      scheduleTick();
    };

    const vv = window.visualViewport;
    lastSizeRef.current = readViewportSize();

    // capture=false for all; passive is fine but not required for resize events
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onOrientationChange, { passive: true });
    vv?.addEventListener('resize', onResize, { passive: true });

    tick();

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientationChange);
      vv?.removeEventListener('resize', onResize);
      if (tRef.current != null) window.clearTimeout(tRef.current);
    };
  }, [delay]);

  return key;
}
