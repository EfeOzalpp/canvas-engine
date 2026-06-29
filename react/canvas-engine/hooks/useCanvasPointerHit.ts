import { useEffect, useRef } from "react";
import { hitTestFieldItem } from "../grid-layout/viewportCoords";
import type { EngineFieldItem } from "../runtime/engine/field";
import type { useCanvasEngine } from "./useCanvasEngine";

type Engine = ReturnType<typeof useCanvasEngine>;

// Skip hover hit-testing above this pointer speed (px/ms = 1000 px/s).
// Fast sweeps don't trigger hover; deliberate slow movement does.
const HOVER_SPEED_THRESHOLD_PX_MS = 1.0;

// How long after the last scroll event before hover resumes (ms).
const SCROLL_COOLDOWN_MS = 150;

let cursorOwnerSeq = 0;
const pickingCursorOwners = new Set<number>();
let savedDocumentCursor: string | null = null;

function setDocumentPickingCursor(ownerId: number, active: boolean) {
  const root = document.documentElement;
  if (active) {
    if (pickingCursorOwners.size === 0) savedDocumentCursor = root.style.cursor;
    pickingCursorOwners.add(ownerId);
    root.style.cursor = "pointer";
    return;
  }

  pickingCursorOwners.delete(ownerId);
  if (pickingCursorOwners.size === 0 && savedDocumentCursor !== null) {
    root.style.cursor = savedDocumentCursor;
    savedDocumentCursor = null;
  }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(
    [
      "a",
      "button",
      "input",
      "label",
      "option",
      "select",
      "textarea",
      "[contenteditable]:not([contenteditable='false'])",
      "[role='button']",
      "[role='checkbox']",
      "[role='link']",
      "[role='radio']",
      "[role='switch']",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",")
  ) !== null;
}

export function useCanvasPointerHit(
  engine: Engine,
  onHover: (item: EngineFieldItem | null) => void,
  onHit: (item: EngineFieldItem | null) => void,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const { ready, controls, readyTick } = engine;
  const onHoverRef = useRef(onHover);
  const onHitRef = useRef(onHit);
  onHoverRef.current = onHover;
  onHitRef.current = onHit;

  useEffect(() => {
    if (!enabled) return;
    if (!ready.current) return;
    const engineControls = controls.current;
    if (!engineControls) return;
    const canvas = engineControls.canvas;
    if (!canvas) return;

    const cursorOwnerId = ++cursorOwnerSeq;
    let lastHoverId: string | null = null;
    let lastClickedId: string | null = null;

    // Scroll suppression
    let isScrolling = false;
    let scrollCooldownId: ReturnType<typeof setTimeout> | null = null;

    // Pointer velocity tracking
    let lastMoveX = 0;
    let lastMoveY = 0;
    let lastMoveTime = 0;

    const setHoverCursor = (active: boolean) => {
      canvas.style.cursor = active ? "pointer" : "";
      setDocumentPickingCursor(cursorOwnerId, active);
    };

    const clearHover = () => {
      const hadHover = lastHoverId !== null;
      lastHoverId = null;
      setHoverCursor(false);
      if (hadHover) {
        engineControls.setInputs({ hoveredItemId: null });
        onHoverRef.current(null);
      }
    };

    const handleScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        clearHover();
      }
      if (scrollCooldownId !== null) clearTimeout(scrollCooldownId);
      scrollCooldownId = setTimeout(() => {
        isScrolling = false;
        scrollCooldownId = null;
      }, SCROLL_COOLDOWN_MS);
    };

    const isInsideCanvas = (e: MouseEvent | PointerEvent): boolean => {
      const rect = canvas.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;
      return cssX >= 0 && cssX <= rect.width && cssY >= 0 && cssY <= rect.height;
    };

    const suppressCanvasDefault = (e: MouseEvent | PointerEvent) => {
      if (!isInsideCanvas(e)) return false;
      if (isInteractiveTarget(e.target)) return false;
      if (e.cancelable) e.preventDefault();
      document.getSelection()?.removeAllRanges();
      return true;
    };

    const test = (e: PointerEvent): EngineFieldItem | null => {
      const rect = canvas.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;
      if (cssX < 0 || cssX > rect.width || cssY < 0 || cssY > rect.height) return null;
      if (isInteractiveTarget(e.target)) return null;
      // Use render-sorted items so the last hit in the array (drawn on top) wins.
      const items = engineControls.getSortedFieldItems?.() ?? engineControls.field.items;
      return hitTestFieldItem(
        cssX,
        cssY,
        items,
        engineControls.layout,
        engineControls.sampleShapeHitMask
      );
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isScrolling) return;
      if (isInteractiveTarget(e.target)) {
        clearHover();
        return;
      }

      const now = e.timeStamp;
      const dt = now - lastMoveTime;
      const dx = e.clientX - lastMoveX;
      const dy = e.clientY - lastMoveY;
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;
      lastMoveTime = now;

      if (dt > 0 && (dx * dx + dy * dy) / (dt * dt) > HOVER_SPEED_THRESHOLD_PX_MS * HOVER_SPEED_THRESHOLD_PX_MS) {
        clearHover();
        return;
      }

      const hit = test(e);
      const hitId = hit?.id ?? null;
      if (hitId !== lastHoverId) {
        lastHoverId = hitId;
        setHoverCursor(hit !== null);
        engineControls.setInputs({ hoveredItemId: hitId });
        onHoverRef.current(hit);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      suppressCanvasDefault(e);
      if (isInteractiveTarget(e.target)) {
        lastClickedId = null;
        engineControls.setInputs({ selectedItemId: null });
        onHitRef.current(null);
        return;
      }

      const hit = test(e);
      const hitId = hit?.id ?? null;
      if (hitId !== null && hitId === lastClickedId) {
        lastClickedId = null;
        engineControls.setInputs({ selectedItemId: null });
        onHitRef.current(null);
      } else {
        lastClickedId = hitId;
        engineControls.setInputs({ selectedItemId: hitId });
        onHitRef.current(hit);
      }
    };

    const handleDoubleClick = (e: MouseEvent) => {
      suppressCanvasDefault(e);
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    window.addEventListener("dblclick", handleDoubleClick, { capture: true });
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      window.removeEventListener("dblclick", handleDoubleClick, { capture: true });
      if (scrollCooldownId !== null) clearTimeout(scrollCooldownId);
      setHoverCursor(false);
    };
  }, [enabled, ready, controls, readyTick]);
}
