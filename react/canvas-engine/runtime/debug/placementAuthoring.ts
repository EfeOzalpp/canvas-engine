import type { HostId } from "../../multi-canvas-setup/hostDefs";
import { SHAPES, type ShapeName } from "../../scene-rules/shapeCatalog";
import type { ProceduralZoneBand } from "../../scene-rules/placement-rules";
import type { CanvasEngineControls } from "../index";

type RadiusShape = "ellipse" | "rect";
type ShapeMode = "hide" | "dim" | "show";
type QuotaMode = string;

interface BrushRadius {
  tiles?: number;
  shape?: RadiusShape;
  xDistort?: number;
  yDistort?: number;
  xTiles?: number;
  yTiles?: number;
}

interface DeviceCountInput {
  mobile?: number;
  tablet?: number;
  laptop?: number;
}

type CountInput = number | DeviceCountInput;

interface BrushShapeRule {
  count?: CountInput;
  quota?: QuotaMode;
}

type BrushShapes = Partial<Record<ShapeName, CountInput | BrushShapeRule>>;

interface PlacementBrush {
  idPrefix?: string;
  band?: ProceduralZoneBand;
  radius?: BrushRadius;
  shapes?: BrushShapes;
  quota?: QuotaMode;
}

interface NormalizedBrush {
  name: string;
  idPrefix: string;
  band: ProceduralZoneBand;
  radius: Required<Pick<BrushRadius, "tiles" | "shape">> &
    Omit<BrushRadius, "tiles" | "shape">;
  shapes: BrushShapes;
  quota: QuotaMode;
}

interface DraftZone {
  id: string;
  hostId: HostId;
  brushName: string;
  band: ProceduralZoneBand;
  center: { x: number; y: number };
  radius: NormalizedBrush["radius"];
  shapes: BrushShapes;
  quota: QuotaMode;
}

interface HostSession {
  hostId: HostId;
  controls: CanvasEngineControls;
}

interface EnableOptions {
  host?: HostId;
  shapes?: ShapeMode;
  grid?: boolean;
}

interface LastZonePatch {
  id?: string;
  band?: ProceduralZoneBand;
  radius?: BrushRadius;
  shapes?: BrushShapes;
  quota?: QuotaMode;
}

interface PlacementAuthoringApi {
  enable: (options?: EnableOptions) => PlacementAuthoringApi;
  disable: () => PlacementAuthoringApi;
  host: (hostId: HostId) => PlacementAuthoringApi;
  target: (hostId: HostId) => PlacementAuthoringApi;
  use: (name: string, overrides?: PlacementBrush) => PlacementAuthoringApi;
  brush: (nameOrBrush: string | PlacementBrush, brush?: PlacementBrush) => PlacementAuthoringApi;
  radius: (radius: BrushRadius) => PlacementAuthoringApi;
  shapes: (shapes: BrushShapes) => PlacementAuthoringApi;
  last: (patch: LastZonePatch) => PlacementAuthoringApi;
  resize: (radius: BrushRadius) => PlacementAuthoringApi;
  grow: (step?: number) => PlacementAuthoringApi;
  shrink: (step?: number) => PlacementAuthoringApi;
  widen: (step?: number) => PlacementAuthoringApi;
  narrow: (step?: number) => PlacementAuthoringApi;
  taller: (step?: number) => PlacementAuthoringApi;
  flatten: (step?: number) => PlacementAuthoringApi;
  rect: () => PlacementAuthoringApi;
  ellipse: () => PlacementAuthoringApi;
  undo: () => PlacementAuthoringApi;
  clear: () => PlacementAuthoringApi;
  hideShapes: () => PlacementAuthoringApi;
  dimShapes: () => PlacementAuthoringApi;
  showShapes: () => PlacementAuthoringApi;
  snippet: () => string;
  copy: () => string;
  zones: () => readonly DraftZone[];
  list: () => readonly string[];
  help: () => string;
}

interface DebugWindow extends Window {
  bePlace?: PlacementAuthoringApi;
  __BE_PLACEMENT_AUTHORING_MANAGER?: PlacementAuthoringManager;
}

const DEFAULT_RADIUS: NormalizedBrush["radius"] = {
  tiles: 5,
  shape: "ellipse",
  xDistort: 2,
  yDistort: 0.55,
};

const DEFAULT_BRUSHES: Record<string, PlacementBrush> = {
  forest: {
    idPrefix: "forest",
    band: "ground",
    radius: { tiles: 5, xDistort: 2.4, yDistort: 0.55 },
    shapes: { trees: 8 },
  },
  town: {
    idPrefix: "town",
    band: "ground",
    radius: { tiles: 6, xDistort: 2.5, yDistort: 0.65 },
    shapes: { villa: 3, house: 2, trees: 5 },
  },
  traffic: {
    idPrefix: "traffic",
    band: "ground",
    radius: { tiles: 4, xDistort: 2.4, yDistort: 0.4 },
    shapes: { car: 3, bus: 1 },
  },
  industry: {
    idPrefix: "industry",
    band: "ground",
    radius: { tiles: 5, xDistort: 2.1, yDistort: 0.45 },
    shapes: { carFactory: 2, power: 1, car: 2 },
  },
  water: {
    idPrefix: "water",
    band: "ground",
    radius: { tiles: 5, xDistort: 1.4, yDistort: 0.3 },
    shapes: { sea: { count: 2, quota: "flat" }, trees: 4 },
  },
  weather: {
    idPrefix: "weather",
    band: "sky",
    radius: { tiles: 5, xDistort: 3.2, yDistort: 0.22 },
    shapes: { clouds: 3, snow: 1 },
  },
  sun: {
    idPrefix: "sun",
    band: "sky",
    radius: { tiles: 2, xDistort: 1.6, yDistort: 0.8 },
    shapes: { sun: { count: 1, quota: "flat" } },
  },
};

const START_QUOTA_SHAPES = new Set<ShapeName>([
  "clouds",
  "snow",
  "house",
  "power",
  "villa",
  "car",
  "carFactory",
  "bus",
  "trees",
]);

const QUESTIONNAIRE_QUOTA_SHAPES = new Set<ShapeName>([
  "clouds",
  "snow",
  "house",
  "power",
  "villa",
  "car",
  "carFactory",
  "bus",
  "trees",
  "sea",
]);

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

function formatNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBrushShapeRule(value: CountInput | BrushShapeRule): value is BrushShapeRule {
  return isObject(value) && ("count" in value || "quota" in value);
}

function mergeBrush(base: PlacementBrush, override?: PlacementBrush): PlacementBrush {
  if (!override) return base;
  return {
    ...base,
    ...override,
    radius: { ...base.radius, ...override.radius },
    shapes: { ...base.shapes, ...override.shapes },
  };
}

function normalizeBrush(name: string, brush: PlacementBrush): NormalizedBrush {
  return {
    name,
    idPrefix: brush.idPrefix ?? name,
    band: brush.band ?? "ground",
    radius: {
      ...DEFAULT_RADIUS,
      ...brush.radius,
      tiles: brush.radius?.tiles ?? DEFAULT_RADIUS.tiles,
      shape: brush.radius?.shape ?? DEFAULT_RADIUS.shape,
    },
    shapes: brush.shapes ?? {},
    quota: brush.quota ?? "auto",
  };
}

function deriveCount(input: CountInput | undefined) {
  if (typeof input === "number") {
    const laptop = Math.max(0, Math.round(input));
    if (laptop <= 1) return { mobile: laptop, tablet: laptop, laptop };
    return {
      mobile: Math.max(0, laptop - 2),
      tablet: Math.max(0, laptop - 1),
      laptop,
    };
  }

  const laptop = Math.max(0, Math.round(input?.laptop ?? input?.tablet ?? input?.mobile ?? 0));
  const tablet = Math.max(0, Math.round(input?.tablet ?? laptop));
  const mobile = Math.max(0, Math.round(input?.mobile ?? tablet));
  return { mobile, tablet, laptop };
}

function quotaRef(hostId: HostId, shape: ShapeName, mode: QuotaMode) {
  if (mode === "flat") return "FLAT_QUOTA";
  if (mode !== "auto") return mode;
  if (hostId === "start" && START_QUOTA_SHAPES.has(shape)) {
    return `START_SHAPE_QUOTAS.${shape}`;
  }
  if (hostId === "questionnaire" && QUESTIONNAIRE_QUOTA_SHAPES.has(shape)) {
    return `Q.${shape}`;
  }
  return "FLAT_QUOTA";
}

function shapeRuleSnippet(hostId: HostId, shape: ShapeName, rule: CountInput | BrushShapeRule, fallbackQuota: QuotaMode) {
  const countInput = isBrushShapeRule(rule) ? rule.count : rule;
  const quotaMode = isBrushShapeRule(rule) ? rule.quota ?? fallbackQuota : fallbackQuota;
  const count = deriveCount(countInput);
  return `{ count: count({ mobile: ${String(count.mobile)}, tablet: ${String(count.tablet)}, laptop: ${String(count.laptop)} }), quota: ${quotaRef(hostId, shape, quotaMode)} }`;
}

function radiusSnippet(radius: DraftZone["radius"]) {
  const parts = [`tiles: ${formatNumber(radius.tiles)}`];
  if (radius.shape !== "ellipse") parts.push(`shape: "${radius.shape}"`);
  if (typeof radius.xDistort === "number") parts.push(`xDistort: ${formatNumber(radius.xDistort)}`);
  if (typeof radius.yDistort === "number") parts.push(`yDistort: ${formatNumber(radius.yDistort)}`);
  if (typeof radius.xTiles === "number") parts.push(`xTiles: ${formatNumber(radius.xTiles)}`);
  if (typeof radius.yTiles === "number") parts.push(`yTiles: ${formatNumber(radius.yTiles)}`);
  return `{ ${parts.join(", ")} }`;
}

function zoneSnippet(zone: DraftZone) {
  const shapeLines: string[] = [];
  for (const shape of SHAPES) {
    const rule = zone.shapes[shape];
    if (rule === undefined) continue;
    shapeLines.push(`          ${shape}: ${shapeRuleSnippet(zone.hostId, shape, rule, zone.quota)},`);
  }

  return [
    "      {",
    `        id: "${zone.id}",`,
    `        band: "${zone.band}",`,
    `        center: { x: ${formatNumber(zone.center.x)}, y: ${formatNumber(zone.center.y)} },`,
    `        radius: ${radiusSnippet(zone.radius)},`,
    "        shapes: {",
    ...shapeLines,
    "        },",
    "      },",
  ].join("\n");
}

function shapeSummary(shapes: BrushShapes) {
  const names = SHAPES.filter((shape) => shapes[shape] !== undefined);
  return names.length ? names.join("+") : "empty";
}

function tilePxForRect(rect: DOMRect) {
  return Math.max(22, Math.min(rect.width, rect.height) / 16);
}

function radiusFromDrag(dx: number, dy: number, rect: DOMRect, shape: RadiusShape): DraftZone["radius"] {
  const tilePx = tilePxForRect(rect);
  const rawX = Math.max(Math.abs(dx), tilePx * 0.5);
  const rawY = Math.max(Math.abs(dy), tilePx * 0.5);
  const tiles = Math.max(1, roundTo(Math.max(rawX, rawY) / tilePx, 0.25));
  return {
    tiles,
    shape,
    xDistort: roundTo(rawX / (tiles * tilePx), 0.05),
    yDistort: roundTo(rawY / (tiles * tilePx), 0.05),
  };
}

class PlacementAuthoringManager {
  private sessions = new Map<HostId, HostSession>();
  private brushes = new Map<string, PlacementBrush>(Object.entries(DEFAULT_BRUSHES));
  private drafts: DraftZone[] = [];
  private activeHost: HostId | null = null;
  private activeBrush = normalizeBrush("forest", DEFAULT_BRUSHES.forest);
  private enabled = false;
  private shapeMode: ShapeMode = "dim";
  private overlay: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private rafId: number | null = null;
  private hideTimer: number | null = null;
  private dragStart: { clientX: number; clientY: number; x: number; y: number } | null = null;
  private previewRadius: DraftZone["radius"] | null = null;
  readonly api: PlacementAuthoringApi;

  constructor() {
    this.api = {
      enable: (options = {}) => this.enable(options),
      disable: () => this.disable(),
      host: (hostId) => this.setHost(hostId),
      target: (hostId) => this.setHost(hostId),
      use: (name, overrides) => this.useBrush(name, overrides),
      brush: (nameOrBrush, brush) => this.defineBrush(nameOrBrush, brush),
      radius: (radius) => this.patchActiveBrush({ radius }),
      shapes: (shapes) => this.patchActiveBrush({ shapes }),
      last: (patch) => this.patchLast(patch),
      resize: (radius) => this.patchLast({ radius }),
      grow: (step = 0.5) => this.adjustLastRadius({ tiles: step }),
      shrink: (step = 0.5) => this.adjustLastRadius({ tiles: -step }),
      widen: (step = 0.15) => this.adjustLastRadius({ xDistort: step }),
      narrow: (step = 0.15) => this.adjustLastRadius({ xDistort: -step }),
      taller: (step = 0.15) => this.adjustLastRadius({ yDistort: step }),
      flatten: (step = 0.15) => this.adjustLastRadius({ yDistort: -step }),
      rect: () => this.patchLast({ radius: { shape: "rect" } }),
      ellipse: () => this.patchLast({ radius: { shape: "ellipse" } }),
      undo: () => this.undo(),
      clear: () => this.clear(),
      hideShapes: () => this.setShapeMode("hide"),
      dimShapes: () => this.setShapeMode("dim"),
      showShapes: () => this.setShapeMode("show"),
      snippet: () => this.snippet(),
      copy: () => this.copy(),
      zones: () => this.drafts.slice(),
      list: () => this.list(),
      help: () => this.help(),
    };
  }

  register(hostId: HostId, controls: CanvasEngineControls) {
    this.sessions.set(hostId, { hostId, controls });
    this.activeHost ??= hostId;
    this.installGlobal();
    this.render();

    return () => {
      const session = this.sessions.get(hostId);
      if (session?.controls === controls) this.sessions.delete(hostId);
      if (this.activeHost === hostId) {
        const nextSession = this.findVisibleSession();
        this.activeHost = nextSession ? nextSession.hostId : null;
      }
      if (this.sessions.size === 0) this.disable();
    };
  }

  private installGlobal() {
    const debugWindow = window as DebugWindow;
    debugWindow.bePlace = this.api;
  }

  private enable(options: EnableOptions) {
    if (options.host) this.activeHost = options.host;
    if (options.shapes) this.shapeMode = options.shapes;

    this.enabled = true;
    this.ensureOverlay();
    this.applyShapeMode();

    if (options.grid === true) {
      const session = this.currentSession();
      if (session) session.controls.setFieldStyle({ debug: { grid: true, gridAlpha: 0.9 } });
    }

    this.startLoop();
    const session = this.currentSession();
    console.info(`[bePlace] enabled on ${session ? session.hostId : "no host"} with brush "${this.activeBrush.name}"`);
    return this.api;
  }

  private disable() {
    this.enabled = false;
    this.dragStart = null;
    this.previewRadius = null;
    if (this.hideTimer !== null) {
      window.clearInterval(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.overlay) this.overlay.style.pointerEvents = "none";
    const session = this.currentSession();
    if (session) session.controls.setFieldVisible(true);
    this.render();
    return this.api;
  }

  private setHost(hostId: HostId) {
    this.activeHost = hostId;
    this.applyShapeMode();
    this.render();
    console.info(`[bePlace] host: ${hostId}`);
    return this.api;
  }

  private useBrush(name: string, overrides?: PlacementBrush) {
    const brush = this.brushes.get(name);
    if (!brush) {
      console.warn(`[bePlace] unknown brush "${name}". Known brushes: ${this.list().join(", ")}`);
      return this.api;
    }
    this.activeBrush = normalizeBrush(name, mergeBrush(brush, overrides));
    this.render();
    console.info(`[bePlace] brush: ${name} (${shapeSummary(this.activeBrush.shapes)})`);
    return this.api;
  }

  private defineBrush(nameOrBrush: string | PlacementBrush, brush?: PlacementBrush) {
    if (typeof nameOrBrush === "string") {
      this.brushes.set(nameOrBrush, brush ?? {});
      return this.useBrush(nameOrBrush);
    }

    this.activeBrush = normalizeBrush("custom", nameOrBrush);
    this.render();
    console.info(`[bePlace] custom brush (${shapeSummary(this.activeBrush.shapes)})`);
    return this.api;
  }

  private patchActiveBrush(patch: PlacementBrush) {
    this.activeBrush = normalizeBrush(
      this.activeBrush.name,
      mergeBrush(
        {
          idPrefix: this.activeBrush.idPrefix,
          band: this.activeBrush.band,
          radius: this.activeBrush.radius,
          shapes: this.activeBrush.shapes,
          quota: this.activeBrush.quota,
        },
        patch
      )
    );
    this.render();
    console.info(`[bePlace] brush patched (${shapeSummary(this.activeBrush.shapes)})`);
    return this.api;
  }

  private patchLast(patch: LastZonePatch) {
    if (this.drafts.length === 0) {
      console.warn("[bePlace] no zones to patch");
      return this.api;
    }
    const last = this.drafts[this.drafts.length - 1];

    if (patch.id) last.id = patch.id;
    if (patch.band) last.band = patch.band;
    if (patch.radius) last.radius = { ...last.radius, ...patch.radius };
    if (patch.shapes) last.shapes = { ...last.shapes, ...patch.shapes };
    if (patch.quota) last.quota = patch.quota;
    this.render();
    return this.api;
  }

  private adjustLastRadius(delta: {
    tiles?: number;
    xDistort?: number;
    yDistort?: number;
  }) {
    if (this.drafts.length === 0) {
      console.warn("[bePlace] no zones to adjust");
      return this.api;
    }

    const last = this.drafts[this.drafts.length - 1];
    const nextRadius = {
      ...last.radius,
      tiles: Math.max(0.25, roundTo(last.radius.tiles + (delta.tiles ?? 0), 0.25)),
      xDistort: Math.max(
        0.05,
        roundTo((last.radius.xDistort ?? 1) + (delta.xDistort ?? 0), 0.05)
      ),
      yDistort: Math.max(
        0.05,
        roundTo((last.radius.yDistort ?? 1) + (delta.yDistort ?? 0), 0.05)
      ),
    };

    last.radius = nextRadius;
    this.render();
    console.info(
      `[bePlace] adjusted ${last.id}: tiles ${formatNumber(nextRadius.tiles)}, xDistort ${formatNumber(nextRadius.xDistort)}, yDistort ${formatNumber(nextRadius.yDistort)}`
    );
    return this.api;
  }

  private undo() {
    const removed = this.drafts.pop();
    this.render();
    if (removed) console.info(`[bePlace] removed ${removed.id}`);
    return this.api;
  }

  private clear() {
    this.drafts = [];
    this.render();
    return this.api;
  }

  private setShapeMode(mode: ShapeMode) {
    this.shapeMode = mode;
    this.applyShapeMode();
    this.render();
    return this.api;
  }

  private applyShapeMode() {
    const session = this.currentSession();
    if (!session) return;

    if (this.hideTimer !== null) {
      window.clearInterval(this.hideTimer);
      this.hideTimer = null;
    }

    if (this.shapeMode === "hide") {
      session.controls.setFieldVisible(false);
      this.hideTimer = window.setInterval(() => {
        const active = this.currentSession();
        if (active) active.controls.setFieldVisible(false);
      }, 300);
      return;
    }

    session.controls.setFieldVisible(true);
  }

  private snippet() {
    const session = this.currentSession();
    const hostId = session ? session.hostId : this.activeHost ?? "questionnaire";
    const zones = this.drafts.filter((zone) => zone.hostId === hostId);
    if (!zones.length) return "[]";
    return ["zones: [", ...zones.map(zoneSnippet), "],"].join("\n");
  }

  private copy() {
    const text = this.snippet();
    void navigator.clipboard.writeText(text).then(
      () => {
        console.info("[bePlace] copied placement snippet");
      },
      () => {
        console.warn("[bePlace] clipboard write failed; snippet returned from bePlace.copy()");
      }
    );
    return text;
  }

  private list() {
    return [...this.brushes.keys()].sort();
  }

  private help() {
    const text = [
      "bePlace.enable({ shapes: 'hide' })",
      "bePlace.use('forest')",
      "bePlace.use('town', { shapes: { villa: 4, house: 2, trees: 6 } })",
      "click to place a zone; drag to author radius; Shift+drag creates a rect radius",
      "Ctrl+Z/Backspace undo; [ ] tiles; arrows distort; R toggles rect/ellipse",
      "bePlace.resize({ tiles: 6, xDistort: 3, yDistort: 0.4 })",
      "bePlace.copy()",
      `brushes: ${this.list().join(", ")}`,
    ].join("\n");
    console.info(text);
    return text;
  }

  private ensureOverlay() {
    if (this.overlay && this.overlayCtx) {
      this.overlay.style.pointerEvents = this.enabled ? "auto" : "none";
      return;
    }

    const overlay = document.createElement("canvas");
    overlay.setAttribute("data-be-placement-authoring", "true");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "2147483646";
    overlay.style.pointerEvents = this.enabled ? "auto" : "none";
    overlay.style.userSelect = "none";
    overlay.style.touchAction = "none";
    overlay.style.background = "transparent";
    document.body.appendChild(overlay);

    const ctx = overlay.getContext("2d");
    if (!ctx) throw new Error("2D canvas context not available");

    overlay.addEventListener("pointerdown", this.onPointerDown);
    overlay.addEventListener("pointermove", this.onPointerMove);
    overlay.addEventListener("pointerup", this.onPointerUp);
    overlay.addEventListener("pointercancel", this.onPointerCancel);
    document.addEventListener("keydown", this.onKeyDown);

    this.overlay = overlay;
    this.overlayCtx = ctx;
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.enabled || event.button !== 0) return;
    const session = this.currentSession();
    if (!session) return;
    const rect = session.controls.canvas?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const point = this.pointFromEvent(event, rect);
    this.dragStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: point.x,
      y: point.y,
    };
    this.previewRadius = this.activeBrush.radius;
    this.overlay?.setPointerCapture(event.pointerId);
    event.preventDefault();
    this.render();
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.enabled || !this.dragStart) return;
    const session = this.currentSession();
    const rect = session?.controls.canvas?.getBoundingClientRect();
    if (!rect) return;

    const dx = event.clientX - this.dragStart.clientX;
    const dy = event.clientY - this.dragStart.clientY;
    if (Math.hypot(dx, dy) > 8) {
      this.previewRadius = radiusFromDrag(dx, dy, rect, event.shiftKey ? "rect" : this.activeBrush.radius.shape);
      this.render();
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.enabled || !this.dragStart) return;
    const session = this.currentSession();
    const rect = session?.controls.canvas?.getBoundingClientRect();
    if (!session || !rect) {
      this.dragStart = null;
      return;
    }

    const dx = event.clientX - this.dragStart.clientX;
    const dy = event.clientY - this.dragStart.clientY;
    const radius =
      Math.hypot(dx, dy) > 8
        ? radiusFromDrag(dx, dy, rect, event.shiftKey ? "rect" : this.activeBrush.radius.shape)
        : this.activeBrush.radius;

    const zone: DraftZone = {
      id: this.nextZoneId(this.activeBrush.idPrefix),
      hostId: session.hostId,
      brushName: this.activeBrush.name,
      band: this.activeBrush.band,
      center: { x: this.dragStart.x, y: this.dragStart.y },
      radius,
      shapes: { ...this.activeBrush.shapes },
      quota: this.activeBrush.quota,
    };

    this.drafts.push(zone);
    this.dragStart = null;
    this.previewRadius = null;
    event.preventDefault();
    this.render();
    console.info(`[bePlace] placed ${zone.id} (${shapeSummary(zone.shapes)})`);
  };

  private onPointerCancel = () => {
    this.dragStart = null;
    this.previewRadius = null;
    this.render();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.enabled) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.target instanceof HTMLElement && event.target.isContentEditable) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      this.undo();
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      this.undo();
      return;
    }

    if (event.key === "[") {
      event.preventDefault();
      this.adjustLastRadius({ tiles: -0.5 });
      return;
    }

    if (event.key === "]") {
      event.preventDefault();
      this.adjustLastRadius({ tiles: 0.5 });
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.adjustLastRadius({ xDistort: -0.15 });
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.adjustLastRadius({ xDistort: 0.15 });
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.adjustLastRadius({ yDistort: -0.15 });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.adjustLastRadius({ yDistort: 0.15 });
      return;
    }

    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      this.toggleLastShape();
    }
  };

  private toggleLastShape() {
    if (this.drafts.length === 0) {
      console.warn("[bePlace] no zones to toggle");
      return this.api;
    }

    const last = this.drafts[this.drafts.length - 1];
    last.radius = {
      ...last.radius,
      shape: last.radius.shape === "rect" ? "ellipse" : "rect",
    };
    this.render();
    console.info(`[bePlace] ${last.id} radius shape: ${last.radius.shape}`);
    return this.api;
  }

  private pointFromEvent(event: PointerEvent, rect: DOMRect) {
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    };
  }

  private nextZoneId(prefix: string) {
    const count = this.drafts.filter((zone) => zone.id.startsWith(`${prefix}-`)).length + 1;
    return `${prefix}-${String(count).padStart(2, "0")}`;
  }

  private startLoop() {
    if (this.rafId !== null) return;
    const frame = () => {
      this.render();
      if (this.enabled) this.rafId = requestAnimationFrame(frame);
      else this.rafId = null;
    };
    this.rafId = requestAnimationFrame(frame);
  }

  private currentSession(): HostSession | null {
    const active = this.activeHost ? this.sessions.get(this.activeHost) : undefined;
    if (active && this.isSessionVisible(active)) return active;
    const visible = this.findVisibleSession();
    if (visible) this.activeHost = visible.hostId;
    return visible;
  }

  private findVisibleSession(): HostSession | null {
    const sessions = [...this.sessions.values()].reverse();
    const visible = sessions.find((session) => this.isSessionVisible(session));
    if (visible) return visible;
    if (sessions.length === 0) return null;
    return sessions[0];
  }

  private isSessionVisible(session: HostSession) {
    const canvas = session.controls.canvas;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    return getComputedStyle(canvas).opacity !== "0";
  }

  private syncOverlayRect() {
    const overlay = this.overlay;
    const session = this.currentSession();
    const canvas = session ? session.controls.canvas : null;
    if (!overlay || !canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const pixelW = Math.max(1, Math.round(rect.width * dpr));
    const pixelH = Math.max(1, Math.round(rect.height * dpr));

    overlay.style.left = `${String(rect.left)}px`;
    overlay.style.top = `${String(rect.top)}px`;
    overlay.style.width = `${String(rect.width)}px`;
    overlay.style.height = `${String(rect.height)}px`;
    overlay.style.right = "auto";
    overlay.style.bottom = "auto";
    overlay.style.pointerEvents = this.enabled ? "auto" : "none";

    if (overlay.width !== pixelW) overlay.width = pixelW;
    if (overlay.height !== pixelH) overlay.height = pixelH;

    const ctx = this.overlayCtx;
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return rect;
  }

  private render() {
    if (!this.overlay || !this.overlayCtx) return;
    const rect = this.syncOverlayRect();
    const ctx = this.overlayCtx;
    if (!rect) {
      ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
      return;
    }

    ctx.clearRect(0, 0, rect.width, rect.height);
    if (!this.enabled) return;

    if (this.shapeMode === "dim") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    this.drawHeader(ctx, rect);
    for (const zone of this.drafts.filter((draft) => draft.hostId === this.activeHost)) {
      this.drawZone(ctx, rect, zone, false);
    }

    if (this.dragStart && this.previewRadius) {
      this.drawZone(
        ctx,
        rect,
        {
          id: "preview",
          hostId: this.activeHost ?? "questionnaire",
          brushName: this.activeBrush.name,
          band: this.activeBrush.band,
          center: { x: this.dragStart.x, y: this.dragStart.y },
          radius: this.previewRadius,
          shapes: this.activeBrush.shapes,
          quota: this.activeBrush.quota,
        },
        true
      );
    }
  }

  private drawHeader(ctx: CanvasRenderingContext2D, rect: DOMRect) {
    const lines = [
      `bePlace ${this.activeHost ?? "no-host"} | ${this.activeBrush.name} | ${shapeSummary(this.activeBrush.shapes)}`,
      "click: zone center | drag: radius | shift+drag: rect | bePlace.copy()",
      "Ctrl+Z/Backspace undo | [ ] tiles | arrows distort | R shape",
    ];
    ctx.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.textBaseline = "top";
    const width = Math.min(rect.width - 24, Math.max(...lines.map((line) => ctx.measureText(line).width)) + 18);
    ctx.fillStyle = "rgba(8, 12, 16, 0.82)";
    ctx.fillRect(12, 12, width, lines.length * 17 + 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    lines.forEach((line, index) => {
      ctx.fillText(line, 20, 20 + index * 17);
    });
  }

  private drawZone(ctx: CanvasRenderingContext2D, rect: DOMRect, zone: DraftZone, preview: boolean) {
    const tilePx = tilePxForRect(rect);
    const x = zone.center.x * rect.width;
    const y = zone.center.y * rect.height;
    const rx = (zone.radius.xTiles ?? zone.radius.tiles * (zone.radius.xDistort ?? 1)) * tilePx;
    const ry = (zone.radius.yTiles ?? zone.radius.tiles * (zone.radius.yDistort ?? 1)) * tilePx;

    ctx.save();
    ctx.lineWidth = preview ? 2 : 1.5;
    ctx.setLineDash(preview ? [6, 4] : []);
    ctx.strokeStyle = preview ? "rgba(255, 214, 102, 0.95)" : "rgba(104, 222, 255, 0.9)";
    ctx.fillStyle = preview ? "rgba(255, 214, 102, 0.12)" : "rgba(104, 222, 255, 0.1)";
    ctx.beginPath();
    if (zone.radius.shape === "rect") {
      ctx.rect(x - rx, y - ry, rx * 2, ry * 2);
    } else {
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.strokeStyle = "rgba(8, 12, 16, 0.85)";
    ctx.lineWidth = 3;
    ctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
    const label = `${zone.id} ${shapeSummary(zone.shapes)} x:${formatNumber(zone.center.x)} y:${formatNumber(zone.center.y)}`;
    ctx.strokeText(label, x + 6, y + 6);
    ctx.fillText(label, x + 6, y + 6);
    ctx.restore();
  }
}

function manager() {
  const debugWindow = window as DebugWindow;
  const existing = debugWindow.__BE_PLACEMENT_AUTHORING_MANAGER;
  if (existing) return existing;
  const next = new PlacementAuthoringManager();
  debugWindow.__BE_PLACEMENT_AUTHORING_MANAGER = next;
  debugWindow.bePlace = next.api;
  return next;
}

export function installPlacementAuthoring({
  hostId,
  controls,
}: {
  hostId: HostId;
  controls: CanvasEngineControls;
}) {
  return manager().register(hostId, controls);
}
