import type { ToothId } from '@/lib/pricing';

export type ImportedTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

export type ToothAnchor = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

/** Arch-angle slab + height range for silver shell masking (object space). */
export type ToothRegion = {
  /** Left / right arch-angle bounds (radians, atan2(x,z)). */
  a0: number;
  a1: number;
  /** Height from gumline → biting edge (object-space Y). */
  y0: number;
  y1: number;
};

/** Symmetric arch layout — U4/U5 = central incisors (viewer left→right = U1→U8). */
const ARCH_RADIUS = 0.92;
const ARCH_SPAN = 1.38;
const ARCH_DEPTH = 0.98;

function angleFor(n: number): number {
  const i = n - 1;
  return -ARCH_SPAN / 2 + (i + 0.5) * (ARCH_SPAN / 8);
}

function buildAnchor(prefix: 'U' | 'L', n: number): ToothAnchor {
  const angle = angleFor(n);
  const x = Math.sin(angle) * ARCH_RADIUS;
  const z = Math.cos(angle) * ARCH_RADIUS * ARCH_DEPTH;
  const y = prefix === 'U' ? 0.06 : -0.22;
  // End premolars tip slightly; centrals more upright
  const tip = n === 1 || n === 8 ? 0.14 : n === 4 || n === 5 ? 0.04 : 0.08;
  const yaw = angle;
  const scale = n === 4 || n === 5 ? 1.05 : n === 3 || n === 6 ? 0.92 : n === 2 || n === 7 ? 1.0 : 0.95;
  return {
    position: [x, y, z],
    rotation: [tip, yaw, 0],
    scale,
  };
}

function buildToothAnchors(): Record<ToothId, ToothAnchor> {
  const out = {} as Record<ToothId, ToothAnchor>;
  for (let n = 1; n <= 8; n++) {
    out[`U${n}` as ToothId] = buildAnchor('U', n);
    out[`L${n}` as ToothId] = buildAnchor('L', n);
  }
  return out;
}

/**
 * Midpoints between tooth angles → gap planes; focus mid-arch (2–7) first.
 * Region span uses a slightly wider arch than cosmetic anchors so slabs cover
 * the fused scan's labial faces (tune with ?debug=1).
 */
function buildToothRegions(): Record<ToothId, ToothRegion> {
  const REGION_SPAN = 1.72;
  const regionAngle = (n: number) =>
    -REGION_SPAN / 2 + (n - 1 + 0.5) * (REGION_SPAN / 8);
  const out = {} as Record<ToothId, ToothRegion>;
  const mk = (prefix: 'U' | 'L', n: number): ToothRegion => {
    const a = regionAngle(n);
    const left =
      n === 1
        ? a - (regionAngle(2) - regionAngle(1)) * 0.55
        : (regionAngle(n - 1) + a) * 0.5;
    const right =
      n === 8
        ? a + (regionAngle(8) - regionAngle(7)) * 0.55
        : (a + regionAngle(n + 1)) * 0.5;
    // Pull neighbors slightly apart for clean silver seams
    const gap = 0.012;
    const a0 = left + gap * 0.5;
    const a1 = right - gap * 0.5;
    // Object-space Y ranges tuned for teeths-blend smile view (nudge via ?debug=1)
    if (prefix === 'U') {
      return { a0, a1, y0: -0.06, y1: 0.36 };
    }
    return { a0, a1, y0: -0.50, y1: 0.0 };
  };
  for (let n = 1; n <= 8; n++) {
    out[`U${n}` as ToothId] = mk('U', n);
    out[`L${n}` as ToothId] = mk('L', n);
  }
  return out;
}

/**
 * Backdrop scan + procedural silver caps.
 * Caps sit on `toothAnchors` over a non-interactive GLB backdrop.
 */
export const modelConfig = {
  /** Fused gums+teeth scan (non-interactive backdrop). */
  backdropUrl: '/models/teeths-blend.glb?v=smooth2' as string | null,
  /**
   * Labial (front) faces +Z toward the camera.
   * Tune with /build?debug=1 if the smile still tips toward the palate.
   */
  backdropTransform: {
    position: [0, -0.08, 0.05],
    // Labial faces +Z (camera). Keep near-identity; camera sits in front & slightly above.
    rotation: [0, 0, 0],
    scale: 0.88,
  } satisfies ImportedTransform,
  /** Hide procedural enamel/gums when backdrop is showing. */
  hideProceduralBase: true,
  /** When true, hides procedural silver caps (shading debug). */
  hideCaps: false,
  /** Warm enamel / matte gum (backdrop shading). */
  toothColor: '#EFE6D4',
  gumColor: '#A06E6E',
  /** Per-tooth transforms for legacy procedural caps / debug dots. */
  toothAnchors: buildToothAnchors(),
  /**
   * Silver shell regions (arch-angle slabs). Paste from ?debug=1 Print regions.
   * Shell duplicates the teeth mesh; only selected styles show silver.
   */
  toothRegions: buildToothRegions(),
  /** Inflate shell along normals (model units; ~0.2mm at this scale). */
  shellInflate: 0.0048,
  /** Use shader silver shell over teeth (not procedural PlaceholderArch caps). */
  useShellGrillz: true,
  /** Optional named-part GLB (unused in backdrop mode). */
  modelUrl: null as string | null,
  usePlaceholder: true,
  maxFileMb: 8,
  camera: {
    /** In front of labial, slightly above — smile view, not palate. */
    position: [0.05, 0.45, 3.2] as [number, number, number],
    target: [0, 0.12, 0.5] as [number, number, number],
    fov: 28,
    minDistance: 2.4,
    maxDistance: 7,
  },
} as const;

export type ModelConfigAnchors = typeof modelConfig.toothAnchors;

/** Deep-clone anchors for debug editing without mutating the module const. */
export function cloneToothAnchors(
  source: Record<ToothId, ToothAnchor> = modelConfig.toothAnchors,
): Record<ToothId, ToothAnchor> {
  const out = {} as Record<ToothId, ToothAnchor>;
  for (const id of Object.keys(source) as ToothId[]) {
    const a = source[id];
    out[id] = {
      position: [...a.position] as [number, number, number],
      rotation: [...a.rotation] as [number, number, number],
      scale: a.scale,
    };
  }
  return out;
}

export function formatAnchorsForPaste(anchors: Record<ToothId, ToothAnchor>): string {
  const lines = (Object.keys(anchors) as ToothId[]).sort().map((id) => {
    const a = anchors[id];
    const p = a.position.map((v) => Number(v.toFixed(4)));
    const r = a.rotation.map((v) => Number(v.toFixed(4)));
    return `  ${id}: { position: [${p.join(', ')}], rotation: [${r.join(', ')}], scale: ${Number(a.scale.toFixed(4))} },`;
  });
  return `toothAnchors: {\n${lines.join('\n')}\n}`;
}

export function cloneToothRegions(
  source: Record<ToothId, ToothRegion> = modelConfig.toothRegions as Record<ToothId, ToothRegion>,
): Record<ToothId, ToothRegion> {
  const out = {} as Record<ToothId, ToothRegion>;
  for (const id of Object.keys(source) as ToothId[]) {
    const r = source[id];
    out[id] = { a0: r.a0, a1: r.a1, y0: r.y0, y1: r.y1 };
  }
  return out;
}

export function formatRegionsForPaste(regions: Record<ToothId, ToothRegion>): string {
  const lines = (Object.keys(regions) as ToothId[]).sort().map((id) => {
    const r = regions[id];
    return `  ${id}: { a0: ${r.a0.toFixed(4)}, a1: ${r.a1.toFixed(4)}, y0: ${r.y0.toFixed(4)}, y1: ${r.y1.toFixed(4)} },`;
  });
  return `toothRegions: {\n${lines.join('\n')}\n}`;
}

/** U1–U8 → 0–7, L1–L8 → 8–15 */
export function toothIndex(id: ToothId): number {
  const n = Number(id.slice(1));
  return id[0] === 'U' ? n - 1 : 8 + (n - 1);
}

export const TOOTH_ID_ORDER: ToothId[] = [
  'U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8',
  'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8',
];
