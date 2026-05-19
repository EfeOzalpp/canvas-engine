// src/canvas-engine/hooks/useSceneField.ts

import { useEffect, useState, type RefObject } from "react";

import { composeField } from "../scene-logic/composeField";
import type { HostId } from "../multi-canvas-setup/hostDefs";
import { HOST_DEFS } from "../multi-canvas-setup/hostDefs";
import type { CanvasEngineControls } from "../runtime";

import { resolveSceneState } from "../adjustable-rules/sceneState";
import type { BaseMode, SceneLookupKey } from "../adjustable-rules/sceneState";

import { resolvePaddingSpec } from "../adjustable-rules/resolvePadding";

import { getCanvasMeta } from "../runtime/p/canvasMeta";
import { getViewportSize } from "../shared/responsiveness";
import { usePreferences } from "../../app/state/preferences-context";
import type { Place } from "../grid-layout/occupancy";

interface Engine {
  ready: RefObject<boolean>;
  controls: RefObject<CanvasEngineControls | null>;
  readyTick?: number;
}

function getCanvasLogicalSize(canvas: HTMLCanvasElement | undefined | null) {
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


export interface SceneSignals {
  questionnaireOpen: boolean;
  isRealMobile: boolean;
}

export function useSceneField(
  engine: Engine,
  hostId: HostId,
  allocAvg: number | undefined,
  signals: SceneSignals,
  reservedFootprints: Place[] | undefined,
  viewportKey?: number | string
) {
  const [canvasResizeTick, setCanvasResizeTick] = useState(0);
  const { ready, controls, readyTick } = engine;

  const hostDef = HOST_DEFS[hostId];
  const { darkMode } = usePreferences();

  const ruleset = hostDef.scene.ruleset;

  const baseMode: BaseMode = hostDef.scene.baseMode;
  const { questionnaireOpen, isRealMobile } = signals;

  // Recompose field when the actual canvas size changes, even if viewport size does not.
  useEffect(() => {
    if (!ready.current) return;

    const engineControls = controls.current;
    const canvas = engineControls?.canvas;
    if (!canvas) return;

    let rafId: number | null = null;
    const bump = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setCanvasResizeTick((t) => t + 1);
      });
    };

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

  useEffect(() => {
    if (!ready.current) return;

    const engineControls = controls.current;
    if (!engineControls) return;

    // Resolve this inside the effect so a fresh profile object does not become a dependency.
    const sceneState = resolveSceneState(
      { questionnaireOpen },
      { baseMode }
    );
    const sceneLookupKey: SceneLookupKey = questionnaireOpen ? "questionnaire" : sceneState.baseMode;
    const profile = ruleset.getProfile(sceneState, { darkMode });

    const canvas = engineControls.canvas;
    const { w, h } = getCanvasLogicalSize(canvas);
    const viewportW = getViewportSize().w;
    const ruleWidthPx =
      hostId === "start" ? viewportW : w;

    // inform runtime about the current lookup key (used by ticker/renderer)
    engineControls.setSceneMode(sceneLookupKey);

    const result = composeField({
      mode: sceneState.baseMode,
      padding: profile.padding,
      placements: profile.placements,
      allocAvg,
      reservedFootprints,
      viewportKey,
      ruleWidthPx,
      canvas: { w, h },
    });

    // Let runtime compute forbidden/rows from the current profile padding
    // and optionally override it (escape hatch)
    const spec = resolvePaddingSpec(ruleWidthPx, profile.padding);
    engineControls.setPaddingSpec(spec);
    engineControls.setBackgroundSpec(profile.background);
    engineControls.setFieldStyle({ darkMode, isRealMobile });

    engineControls.setFieldItems(result.placed);
    engineControls.setFieldVisible(result.placed.length > 0);
  }, [
    ready,
    controls,
    readyTick,
    allocAvg,
    questionnaireOpen,
    viewportKey,
    canvasResizeTick,
    hostId,
    baseMode,
    ruleset,
    reservedFootprints,
    darkMode,
    isRealMobile,
  ]);
}
