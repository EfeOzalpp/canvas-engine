// src/canvas-engine/runtime/platform/mount.ts

export type EngineLayoutMode = "fixed" | "inherit" | "auto";

const ENGINE_OWNED_MOUNT_ATTR = "data-be-engine-owned-mount";

export function isEngineOwnedMount(el: HTMLElement) {
  return el.getAttribute(ENGINE_OWNED_MOUNT_ATTR) === "true";
}

export function ensureMount(mount: string, zIndex?: number, layout: EngineLayoutMode = "fixed") {
  let el = document.querySelector<HTMLElement>(mount);
  const existed = !!el;

  if (!el) {
    el = document.createElement("div");
    el.id = mount.startsWith("#") ? mount.slice(1) : mount;
    el.setAttribute(ENGINE_OWNED_MOUNT_ATTR, "true");
    document.body.appendChild(el);
  }

  // Layout semantics:
  // - fixed: engine owns a fullscreen fixed layer (default)
  // - inherit: engine renders inside an existing container; do not force fullscreen
  // - auto: fixed if we had to create the mount, otherwise inherit
  const mode: EngineLayoutMode = layout === "auto" ? (existed ? "inherit" : "fixed") : layout;

  if (mode === "fixed") {
    el.style.zIndex = String(typeof zIndex === "number" && Number.isFinite(zIndex) ? zIndex : 2);
  } else {
    // inherit: don't stomp geometry; just ensure we can absolutely position the canvas
    const pos = getComputedStyle(el).position;
    if (pos === "static" || pos === "") el.style.position = "relative";
    // zIndex only matters if the container participates in stacking; set only if asked
    if (typeof zIndex === "number" && Number.isFinite(zIndex)) el.style.zIndex = String(zIndex);
  }

  el.style.pointerEvents = "none";
  el.style.userSelect = "none";
  el.style.background = "var(--ui-bg-page)";
  el.style.setProperty("-webkit-tap-highlight-color", "transparent");
  el.classList.add("be-canvas-layer");

  return el;
}

export function applyCanvasStyle(el: HTMLCanvasElement) {
  el.style.position = "absolute";
  el.style.inset = "0";
  el.style.zIndex = "0";
  el.style.pointerEvents = "none";
  el.style.userSelect = "none";
  el.style.background = "var(--ui-bg-page)";
  el.style.transform = "translateZ(0)";
  el.style.imageRendering = "auto";
  el.setAttribute("tabindex", "-1");
}

// Active engine ownership by mount selector / mount element.
interface EngineRecord { stop: () => void }

const REGISTRY_BY_EL = new WeakMap<HTMLElement, EngineRecord>();
const REGISTRY_BY_KEY = new Map<string, HTMLElement>();

function mountKey(mount: string) {
  return mount.trim();
}

function tryResolveMountEl(mount: string): HTMLElement | null {
  try {
    return document.querySelector(mount);
  } catch {
    return null;
  }
}

function stopByEl(el: HTMLElement) {
  try {
    const rec = REGISTRY_BY_EL.get(el);
    rec?.stop();
  } catch {}
  try {
    REGISTRY_BY_EL.delete(el);
  } catch {}
}

export function registerEngineInstance(args: {
  mount: string;
  parentEl: HTMLElement;
  stop: () => void;
}) {
  const { mount, parentEl, stop } = args;
  const key = mountKey(mount);

  const existing = REGISTRY_BY_EL.get(parentEl);
  if (existing?.stop) {
    try {
      existing.stop();
    } catch {}
  }
  try {
    REGISTRY_BY_EL.delete(parentEl);
  } catch {}

  const prevEl = REGISTRY_BY_KEY.get(key);
  if (prevEl && prevEl !== parentEl) stopByEl(prevEl);

  REGISTRY_BY_KEY.set(key, parentEl);
  REGISTRY_BY_EL.set(parentEl, { stop });

  return () => {
    try {
      const cur = REGISTRY_BY_KEY.get(key);
      if (cur === parentEl) REGISTRY_BY_KEY.delete(key);
    } catch {}
    try {
      stopByEl(parentEl);
    } catch {}
  };
}

export function stopCanvasEngine(mount = "#canvas-root") {
  const key = mountKey(mount);

  try {
    const el = REGISTRY_BY_KEY.get(key);
    if (el) {
      stopByEl(el);
      REGISTRY_BY_KEY.delete(key);
    }
  } catch {}

  try {
    const el = tryResolveMountEl(mount);
    if (el) stopByEl(el);
  } catch {}

  try {
    const el = document.querySelector(mount);
    if (el instanceof HTMLElement && isEngineOwnedMount(el)) el.remove();
  } catch {}
}

export function isCanvasRunning(mount = "#canvas-root") {
  try {
    const el = REGISTRY_BY_KEY.get(mountKey(mount));
    if (el) return !!REGISTRY_BY_EL.get(el);
  } catch {}

  try {
    const el = tryResolveMountEl(mount);
    if (el) return !!REGISTRY_BY_EL.get(el);
  } catch {}

  return false;
}

export function stopAllCanvasEngines() {
  for (const [key, el] of [...REGISTRY_BY_KEY.entries()]) {
    try {
      stopByEl(el);
    } catch {}
    try {
      REGISTRY_BY_KEY.delete(key);
    } catch {}
  }
}
