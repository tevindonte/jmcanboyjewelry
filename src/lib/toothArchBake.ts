import * as THREE from 'three';
import type { ToothId } from '@/lib/pricing';
import {
  modelConfig,
  toothIndex,
  type ToothRegion,
} from '@/lib/model.config';

const BINS = 128;
/** Reject verts nearly equidistant to two *adjacent* centers (interproximal). */
const VORONOI_MARGIN = 0.008;

/**
 * Arch parameter in radians — atan2(x, z). 0 = +Z (labial / camera).
 */
export function archParam(x: number, z: number): number {
  return Math.atan2(x, z);
}

type Center = { x: number; z: number; y: number };

/**
 * Find 8 tooth centers from labial crown vertices (density peaks along the arch).
 * Falls back to cosmetic anchors if the mesh is too sparse.
 */
export function detectToothCenters(
  positions: ArrayLike<number>,
  y0: number,
  y1: number,
  prefix: 'U' | 'L',
): Center[] {
  const ARCH_HALF = 0.95;
  const span0 = -ARCH_HALF;
  const span1 = ARCH_HALF;
  const span = span1 - span0;
  const counts = new Float64Array(BINS);
  const sumX = new Float64Array(BINS);
  const sumY = new Float64Array(BINS);
  const sumZ = new Float64Array(BINS);

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (y < y0 + 0.02 || y > y1 - 0.02) continue;
    if (z < 0.08) continue;
    const r = Math.hypot(x, z);
    if (r < 0.3 || r > 1.5) continue;
    const a = archParam(x, z);
    if (a < span0 || a > span1) continue;
    const b = Math.min(BINS - 1, Math.floor(((a - span0) / span) * BINS));
    counts[b] += 1;
    sumX[b] += x;
    sumY[b] += y;
    sumZ[b] += z;
  }

  let populated = 0;
  for (let b = 0; b < BINS; b++) if (counts[b] >= 3) populated += 1;
  if (populated < 20) {
    return anchorCenters(prefix);
  }

  const dens = new Float64Array(BINS);
  for (let b = 0; b < BINS; b++) {
    let s = 0;
    let w = 0;
    for (let k = -2; k <= 2; k++) {
      const j = b + k;
      if (j < 0 || j >= BINS) continue;
      const ww = 3 - Math.abs(k);
      s += counts[j] * ww;
      w += ww;
    }
    dens[b] = w > 0 ? s / w : 0;
  }

  const centers: Center[] = [];
  const slot = span / 8;
  for (let n = 0; n < 8; n++) {
    const loA = span0 + n * slot;
    const hiA = span0 + (n + 1) * slot;
    const lo = Math.floor(((loA - span0) / span) * BINS);
    const hi = Math.ceil(((hiA - span0) / span) * BINS);
    let bestB = Math.floor((lo + hi) / 2);
    let bestV = -Infinity;
    for (let b = Math.max(0, lo); b <= Math.min(BINS - 1, hi); b++) {
      if (dens[b] > bestV) {
        bestV = dens[b];
        bestB = b;
      }
    }
    // Centroid of bin neighborhood
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let cw = 0;
    for (let k = -2; k <= 2; k++) {
      const j = bestB + k;
      if (j < 0 || j >= BINS || counts[j] < 1) continue;
      cx += sumX[j];
      cy += sumY[j];
      cz += sumZ[j];
      cw += counts[j];
    }
    if (cw < 1) {
      const a = span0 + ((bestB + 0.5) / BINS) * span;
      centers.push({ x: Math.sin(a) * 0.9, y: (y0 + y1) * 0.5, z: Math.cos(a) * 0.9 });
    } else {
      centers.push({ x: cx / cw, y: cy / cw, z: cz / cw });
    }
  }

  // Ensure left→right order by angle
  centers.sort((a, b) => archParam(a.x, a.z) - archParam(b.x, b.z));
  return centers;
}

function anchorCenters(prefix: 'U' | 'L'): Center[] {
  const out: Center[] = [];
  for (let n = 1; n <= 8; n++) {
    const id = `${prefix}${n}` as ToothId;
    const a = modelConfig.toothAnchors[id];
    out.push({ x: a.position[0], y: a.position[1], z: a.position[2] });
  }
  return out;
}

function borderMid(
  centers: Center[],
  borderIndex: number,
  nudge: number,
): { mx: number; mz: number; nx: number; nz: number } {
  if (borderIndex === 0) {
    const c0 = centers[0];
    const c1 = centers[1];
    const dx = c0.x - c1.x;
    const dz = c0.z - c1.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    return {
      mx: c0.x + nx * (0.5 * len + nudge),
      mz: c0.z + nz * (0.5 * len + nudge),
      nx,
      nz,
    };
  }
  if (borderIndex === 8) {
    const c7 = centers[7];
    const c6 = centers[6];
    const dx = c7.x - c6.x;
    const dz = c7.z - c6.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    return {
      mx: c7.x + nx * (0.5 * len + nudge),
      mz: c7.z + nz * (0.5 * len + nudge),
      nx,
      nz,
    };
  }
  const c0 = centers[borderIndex - 1];
  const c1 = centers[borderIndex];
  const dx = c1.x - c0.x;
  const dz = c1.z - c0.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len;
  const nz = dz / len;
  return {
    mx: (c0.x + c1.x) * 0.5 + nx * nudge,
    mz: (c0.z + c1.z) * 0.5 + nz * nudge,
    nx,
    nz,
  };
}

function nudgesFromRegions(
  regions: Record<ToothId, ToothRegion>,
  prefix: 'U' | 'L',
  centers: Center[],
): number[] {
  const nudges = new Array(9).fill(0);
  for (let i = 1; i <= 7; i++) {
    const leftId = `${prefix}${i}` as ToothId;
    const borderAng = regions[leftId].a1;
    const c0 = centers[i - 1];
    const c1 = centers[i];
    const midAng = archParam((c0.x + c1.x) * 0.5, (c0.z + c1.z) * 0.5);
    const len = Math.hypot(c1.x - c0.x, c1.z - c0.z) || 1;
    nudges[i] = (borderAng - midAng) * len * 1.2;
  }
  const leftAng = regions[`${prefix}1` as ToothId].a0;
  const c0 = centers[0];
  const c1 = centers[1];
  const gap0 = Math.hypot(c0.x - c1.x, c0.z - c1.z) || 1;
  const defaultLeft = archParam(c0.x, c0.z) - Math.abs(archParam(c1.x, c1.z) - archParam(c0.x, c0.z)) * 0.5;
  nudges[0] = (defaultLeft - leftAng) * gap0;
  const rightAng = regions[`${prefix}8` as ToothId].a1;
  const c7 = centers[7];
  const c6 = centers[6];
  const gap7 = Math.hypot(c7.x - c6.x, c7.z - c6.z) || 1;
  const defaultRight = archParam(c7.x, c7.z) + Math.abs(archParam(c7.x, c7.z) - archParam(c6.x, c6.z)) * 0.5;
  nudges[8] = (rightAng - defaultRight) * gap7;
  return nudges;
}

/** Cache mesh-detected centers per geometry uuid so debug nudges stay stable. */
const centerCache = new WeakMap<THREE.BufferGeometry, Center[]>();

/**
 * Assign each vertex to a tooth via planes between mesh-detected centers
 * (perpendicular to the arch). Inset borders so gap verts get id=-1 (no bleed).
 */
export function bakeToothIdAttribute(
  geometry: THREE.BufferGeometry,
  regions: Record<ToothId, ToothRegion>,
  isUp: boolean,
): void {
  const pos = geometry.getAttribute('position');
  if (!pos) return;

  const prefix = isUp ? 'U' : 'L';
  const y0 = regions[`${prefix}1` as ToothId].y0;
  const y1 = regions[`${prefix}1` as ToothId].y1;

  // Prefer mesh-detected centers; fall back to cosmetic anchors if sparse
  let centers = centerCache.get(geometry);
  if (!centers) {
    centers = detectToothCenters(pos.array, y0, y1, prefix);
    // Guard against collapsed end slots (auto-valley can pinch U8/L8)
    const span =
      archParam(centers[7].x, centers[7].z) -
      archParam(centers[0].x, centers[0].z);
    if (span < 0.8) {
      centers = anchorCenters(prefix);
    }
    centerCache.set(geometry, centers);
  }

  const nudges = nudgesFromRegions(regions, prefix, centers);
  const borders = Array.from({ length: 9 }, (_, i) =>
    borderMid(centers, i, nudges[i]),
  );

  const ids = new Float32Array(pos.count);
  const us = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (y < y0 - 0.05 || y > y1 + 0.05) {
      ids[i] = -1;
      us[i] = 0.5;
      continue;
    }

    // Nearest center (Voronoi) — primary assignment along the arch
    let best = 0;
    let second = 1;
    let bestD = Infinity;
    let secondD = Infinity;
    for (let n = 0; n < 8; n++) {
      const dx = x - centers[n].x;
      const dz = z - centers[n].z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD) {
        secondD = bestD;
        second = best;
        bestD = d;
        best = n;
      } else if (d < secondD) {
        secondD = d;
        second = n;
      }
    }

    // Reject only true neighbor-gap verts (not equidistant to distant teeth)
    if (
      Math.abs(best - second) === 1 &&
      secondD - bestD < VORONOI_MARGIN
    ) {
      ids[i] = -1;
      us[i] = 0.5;
      continue;
    }

    const left = borders[best];
    const right = borders[best + 1];
    const d0 = (x - left.mx) * left.nx + (z - left.mz) * left.nz;
    const width =
      (right.mx - left.mx) * left.nx + (right.mz - left.mz) * left.nz;

    const toothNum = best + 1;
    ids[i] = toothIndex(`${prefix}${toothNum}` as ToothId);
    us[i] = d0 / Math.max(width, 1e-4);
  }

  geometry.setAttribute('aToothId', new THREE.BufferAttribute(ids, 1));
  geometry.setAttribute('aToothU', new THREE.BufferAttribute(us, 1));
}

export function bordersFromRegions(
  regions: Record<ToothId, ToothRegion>,
  prefix: 'U' | 'L',
): number[] {
  const borders: number[] = [];
  for (let n = 1; n <= 8; n++) {
    borders.push(regions[`${prefix}${n}` as ToothId].a0);
  }
  borders.push(regions[`${prefix}8` as ToothId].a1);
  return borders;
}

export function applyBordersToRegions(
  regions: Record<ToothId, ToothRegion>,
  prefix: 'U' | 'L',
  borders: number[],
): Record<ToothId, ToothRegion> {
  const next = { ...regions };
  for (let n = 1; n <= 8; n++) {
    const id = `${prefix}${n}` as ToothId;
    next[id] = {
      ...next[id],
      a0: borders[n - 1],
      a1: borders[n],
    };
  }
  return next;
}

export function detectValleyBorders(
  positions: ArrayLike<number>,
  y0: number,
  y1: number,
  prefix: 'U' | 'L' = 'U',
): number[] {
  const centers = detectToothCenters(positions, y0, y1, prefix);
  const borders: number[] = [];
  const c0 = centers[0];
  const c1 = centers[1];
  borders.push(
    archParam(c0.x, c0.z) -
      Math.abs(archParam(c1.x, c1.z) - archParam(c0.x, c0.z)) * 0.5,
  );
  for (let i = 0; i < 7; i++) {
    const a = centers[i];
    const b = centers[i + 1];
    borders.push(archParam((a.x + b.x) * 0.5, (a.z + b.z) * 0.5));
  }
  const c6 = centers[6];
  const c7 = centers[7];
  borders.push(
    archParam(c7.x, c7.z) +
      Math.abs(archParam(c7.x, c7.z) - archParam(c6.x, c6.z)) * 0.5,
  );
  return borders;
}

export function seedRegionsFromValleys(
  positions: ArrayLike<number>,
  regions: Record<ToothId, ToothRegion>,
  isUp: boolean,
): Record<ToothId, ToothRegion> {
  const prefix = isUp ? 'U' : 'L';
  const y0 = regions[`${prefix}1` as ToothId].y0;
  const y1 = regions[`${prefix}1` as ToothId].y1;
  const borders = detectValleyBorders(positions, y0, y1, prefix);
  return applyBordersToRegions(regions, prefix, borders);
}
