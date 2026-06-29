// src/canvas-engine/hooks/useSceneField.ts

import { useLayoutEffect, useRef } from "react";

import {
  resolveAuthoredLightSource,
  resolveRuntimePlacements,
} from "../scene-logic";
import { composeFieldAsync } from "../../workers/scene/compose-worker-host";
import type { HostId } from "../multi-canvas-setup/hostDefs";
import { HOST_DEFS } from "../multi-canvas-setup/hostDefs";
import type { CanvasEngineControls } from "../runtime";
import type { EngineShapeLightSource } from "../runtime/engine/state";
import { fieldRefreshSignature } from "./sceneFieldSignature";
import type { useCanvasEngine } from "./useCanvasEngine";
import { getCanvasLogicalSize, useCanvasLogicalSizeTick } from "./useCanvasLogicalSize";

import type { SceneLookupKey, SceneState } from "../scene-state";

import { resolvePaddingPolicyVariants, resolvePaddingSpec } from "../scene-rules/canvas-padding";
import type { ScenePlacementRules } from "../scene-rules/placement-rules";

import { getViewportSize, type DeviceCountScale } from "../shared/responsiveness";
import { usePreferences } from "../../app/state/preferences-context";
import type { Place } from "../grid-layout/occupancy";

type Engine = ReturnType<typeof useCanvasEngine>;


export function useSceneField(
  engine: Engine,
  hostId: HostId,
  liveAvg: number | undefined,
  reservedFootprints: Place[] | undefined,
  viewportKey?: number | string,
  spotlightIndex?: number,
  fog?: boolean,
  shapeLightSource?: EngineShapeLightSource | null,
  initialFieldDelayMs = 0
) {
  const fieldDelayStateRef = useRef<{ generation: number; untilMs: number } | null>(null);
  const fieldApplyStateRef = useRef<{
    liveAvg: number | undefined;
    signature: string;
    itemCount: number;
  } | null>(null);
  const { ready, controls, readyTick } = engine;

  const hostDef = HOST_DEFS[hostId];
  const { darkMode } = usePreferences();
  const canvasResizeTick = useCanvasLogicalSizeTick(engine);

  const ruleset = hostDef.scene.ruleset;
  const sceneLookupKey: SceneLookupKey = hostDef.scene.lookupKey;

  useLayoutEffect(() => {
    if (!ready.current) return;

    let cancelled = false;
    let fieldRafId: number | null = null;
    let fieldTimerId: number | null = null;

    const readyGeneration = readyTick;
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    let fieldDelayMs = 0;
    if (initialFieldDelayMs > 0) {
      let delayState = fieldDelayStateRef.current;
      if (delayState?.generation !== readyGeneration) {
        delayState = {
          generation: readyGeneration,
          untilMs: nowMs + initialFieldDelayMs,
        };
        fieldDelayStateRef.current = delayState;
      }

      fieldDelayMs = Math.max(0, delayState.untilMs - nowMs);
    }

    const composeAndApplyField = async (
      engineControls: CanvasEngineControls,
      args: {
        padding: ReturnType<typeof resolvePaddingPolicyVariants>;
        placements: ScenePlacementRules;
        landscapeCountScale: DeviceCountScale | undefined;
        ruleWidthPx: number;
        canvas: { w: number; h: number };
        refreshSignature: string;
      }
    ) => {
      if (!ready.current) return;

      const placed = await composeFieldAsync({
        padding: args.padding,
        placements: args.placements,
        liveAvg,
        reservedFootprints,
        landscapeCountScale: args.landscapeCountScale,
        ruleWidthPx: args.ruleWidthPx,
        canvas: args.canvas,
      });

      if (cancelled) return;

      const previousApply = fieldApplyStateRef.current;
      const liveAvgOnlyRefresh =
        previousApply !== null &&
        previousApply.itemCount > 0 &&
        placed.length > 0 &&
        previousApply.signature === args.refreshSignature &&
        !Object.is(previousApply.liveAvg, liveAvg);

      engineControls.setFieldItems(placed, { replayAppear: !liveAvgOnlyRefresh });
      engineControls.setFieldVisible(placed.length > 0);
      fieldApplyStateRef.current = {
        liveAvg,
        signature: args.refreshSignature,
        itemCount: placed.length,
      };
    };

    const engineControls = controls.current;
    if (!engineControls) return;

    const sceneState: SceneState = { lookupKey: sceneLookupKey };
    const profile = ruleset.getProfile(sceneState, { darkMode });
    const placements = resolveRuntimePlacements(profile.placements, spotlightIndex);
    const padding = resolvePaddingPolicyVariants(profile.padding, spotlightIndex);

    const canvas = engineControls.canvas;
    const { w, h } = getCanvasLogicalSize(canvas);
    const viewportW = getViewportSize().w;
    // Device-band rules should follow the actual viewport/device, not the
    // bounded size of a canvas instance such as Spotlight.
    const ruleWidthPx = viewportW;
    const resolvedShapeLightSource =
      shapeLightSource === undefined
        ? resolveAuthoredLightSource(placements, liveAvg, ruleWidthPx)
        : shapeLightSource;

    // Let runtime compute forbidden/rows from the current profile padding
    // and receive the other resolved scene policies as one handoff.
    const spec = resolvePaddingSpec(ruleWidthPx, padding);
    engineControls.setSceneProfile({
      lookupKey: sceneLookupKey,
      paddingSpec: spec,
      background: profile.background,
      ambientParticles: profile.ambientParticles,
      fog: profile.fog,
      foliage: profile.foliage,
      renderCache: profile.renderCache,
    });
    engineControls.setFieldStyle({ darkMode, fog, shapeLightSource: resolvedShapeLightSource });

    const fieldArgs = {
      padding,
      placements,
      landscapeCountScale: profile.landscapeCountScale,
      ruleWidthPx,
      canvas: { w, h },
      refreshSignature: fieldRefreshSignature({
        hostId,
        sceneLookupKey,
        viewportKey,
        spotlightIndex,
        fog,
        darkMode,
        canvas: { w, h },
        reservedFootprints,
        shapeLightSource,
      }),
    };

    if (fieldDelayMs > 0) {
      // Start worker computation immediately while the delay timer runs in parallel.
      // The RAF fires only once both the compute and the delay have completed.
      engineControls.setFieldVisible(false);
      const delayState = fieldDelayStateRef.current;
      void composeFieldAsync({
        padding: fieldArgs.padding,
        placements: fieldArgs.placements,
        liveAvg,
        reservedFootprints,
        landscapeCountScale: fieldArgs.landscapeCountScale,
        ruleWidthPx: fieldArgs.ruleWidthPx,
        canvas: fieldArgs.canvas,
      }).then((placed) => {
        if (cancelled) return;
        const remainingMs = Math.max(
          0,
          (delayState?.untilMs ?? 0) - performance.now(),
        );
        const applyInRaf = () => {
          fieldRafId = requestAnimationFrame(() => {
            fieldRafId = null;
            if (cancelled) return;
            engineControls.setFieldItems(placed, { replayAppear: true });
            engineControls.setFieldVisible(placed.length > 0);
            fieldApplyStateRef.current = {
              liveAvg,
              signature: fieldArgs.refreshSignature,
              itemCount: placed.length,
            };
          });
        };
        if (remainingMs > 0) {
          fieldTimerId = window.setTimeout(() => {
            fieldTimerId = null;
            applyInRaf();
          }, remainingMs);
        } else {
          applyInRaf();
        }
      });
      return;
    }

    void composeAndApplyField(engineControls, fieldArgs);

    return () => {
      cancelled = true;
      if (fieldRafId !== null) cancelAnimationFrame(fieldRafId);
      if (fieldTimerId !== null) window.clearTimeout(fieldTimerId);
    };
  }, [
    ready,
    controls,
    readyTick,
    liveAvg,
    viewportKey,
    spotlightIndex,
    fog,
    shapeLightSource,
    canvasResizeTick,
    hostId,
    sceneLookupKey,
    ruleset,
    reservedFootprints,
    darkMode,
    initialFieldDelayMs,
  ]);
}
