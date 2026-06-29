// src/canvas-engine/modifiers/particles/store.ts

export interface ParticleStore {
  particleEmitters: Map<string, unknown>;
  puffEmitters: Map<string, unknown>;
  clear(): void;
}

export function createParticleStore(): ParticleStore {
  const particleEmitters = new Map<string, unknown>();
  const puffEmitters = new Map<string, unknown>();

  return {
    particleEmitters,
    puffEmitters,
    clear() {
      particleEmitters.clear();
      puffEmitters.clear();
    },
  };
}

export function getParticleEmitterMap<State>(store: ParticleStore): Map<string, State> {
  return store.particleEmitters as Map<string, State>;
}

export function getPuffEmitterMap<State>(store: ParticleStore): Map<string, State> {
  return store.puffEmitters as Map<string, State>;
}
