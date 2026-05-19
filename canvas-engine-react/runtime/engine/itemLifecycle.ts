import type { GridFootprint } from "../../modifiers/index";
import type { EngineFieldItem } from "./field";

export interface LiveState {
  bornAtMs: number;
}

function footprintKey(footprint?: GridFootprint): string {
  if (!footprint) return "";
  return `${String(footprint.w)}|${String(footprint.h)}|${String(footprint.r0)}|${String(footprint.c0)}`;
}

function shouldReplayAppear(prev: EngineFieldItem, next: EngineFieldItem): boolean {
  if (prev.shape !== next.shape) return true;
  if (footprintKey(prev.footprint) !== footprintKey(next.footprint)) return true;

  const dx = Math.abs(prev.x - next.x);
  const dy = Math.abs(prev.y - next.y);
  return dx > 0.1 || dy > 0.1;
}

export function reconcileLiveStatesOnFieldUpdate(args: {
  prevItems: EngineFieldItem[];
  nextItems: EngineFieldItem[];
  liveStates: Map<string, LiveState>;
  nowMs: number;
}) {
  const { prevItems, nextItems, liveStates, nowMs } = args;

  const prevById = new Map<string, EngineFieldItem>();
  for (const it of prevItems) prevById.set(it.id, it);

  const nextIds = new Set<string>();
  for (const it of nextItems) nextIds.add(it.id);

  for (const id of Array.from(liveStates.keys())) {
    if (!nextIds.has(id)) liveStates.delete(id);
  }

  for (const next of nextItems) {
    const state = liveStates.get(next.id);
    if (!state) continue;

    const prev = prevById.get(next.id);
    if (!prev || shouldReplayAppear(prev, next)) {
      state.bornAtMs = nowMs;
    }
  }
}
