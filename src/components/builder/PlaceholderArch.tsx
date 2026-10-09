'use client';

import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ToothStyle } from '@/lib/pricing.config';
import type { TeethMap, ToothId } from '@/lib/pricing';
import { toothIdsForArch } from '@/lib/pricing';
import type { ArchChoice } from '@/lib/pricing.config';
import type { ToothAnchor } from '@/lib/model.config';

/** U-arch — sized so FrameArch can fill ~75% of the canvas. */
const ARCH_RADIUS = 0.95;
const ARCH_SPAN = 1.42;
const ARCH_DEPTH = 1.05;

type ToothKind = 'central' | 'lateral' | 'canine' | 'premolar';

function toothKind(id: ToothId): ToothKind {
  const n = Number(id.slice(1));
  if (n === 4 || n === 5) return 'central';
  if (n === 3 || n === 6) return 'lateral';
  if (n === 2 || n === 7) return 'canine';
  return 'premolar';
}

export function toothAngle(id: ToothId): number {
  const n = Number(id.slice(1));
  const i = n - 1;
  return -ARCH_SPAN / 2 + (i + 0.5) * (ARCH_SPAN / 8);
}

export function toothPosition(id: ToothId): [number, number, number] {
  const arch = id[0] as 'U' | 'L';
  const angle = toothAngle(id);
  const x = Math.sin(angle) * ARCH_RADIUS;
  const z = Math.cos(angle) * ARCH_RADIUS * ARCH_DEPTH;
  const y = arch === 'U' ? 0.04 : -0.26;
  return [x, y, z];
}

function toothDims(id: ToothId): { w: number; h: number; d: number } {
  const slot = ARCH_RADIUS * (ARCH_SPAN / 8);
  const kind = toothKind(id);
  switch (kind) {
    case 'central':
      return { w: slot * 1.05, h: 0.22, d: 0.11 };
    case 'lateral':
      return { w: slot * 0.78, h: 0.2, d: 0.1 };
    case 'canine':
      // Wider base, shorter rounded cusp — not a blade
      return { w: slot * 1.22, h: 0.2, d: 0.125 };
    default:
      // End premolars — taller crown, deeper body (not a flat tile)
      return { w: slot * 0.9, h: 0.22, d: 0.145 };
  }
}

function createToothShape(id: ToothId, forShell: boolean): THREE.Shape {
  const { w, h } = toothDims(id);
  const kind = toothKind(id);
  const hw = (w / 2) * (forShell ? 1.05 : 1);
  const hh = (h / 2) * (forShell ? 1.03 : 1);
  const shape = new THREE.Shape();

  if (kind === 'canine') {
    // Wide cervical base → soft rounded cusp (not a blade)
    const neck = hw * 0.98;
    shape.moveTo(-neck, -hh);
    shape.quadraticCurveTo(0, -hh * 1.01, neck, -hh);
    shape.quadraticCurveTo(hw * 1.08, -hh * 0.3, hw * 1.0, hh * 0.05);
    shape.quadraticCurveTo(hw * 0.85, hh * 0.55, hw * 0.45, hh * 0.78);
    shape.quadraticCurveTo(0, hh * 0.95, -hw * 0.45, hh * 0.78);
    shape.quadraticCurveTo(-hw * 0.85, hh * 0.55, -hw * 1.0, hh * 0.05);
    shape.quadraticCurveTo(-hw * 1.08, -hh * 0.3, -neck, -hh);
  } else if (kind === 'premolar') {
    // Clear tooth silhouette: narrow cervix, convex body, peaked crown
    const neck = hw * 0.5;
    shape.moveTo(-neck, -hh);
    shape.quadraticCurveTo(0, -hh * 1.18, neck, -hh);
    shape.quadraticCurveTo(hw * 0.85, -hh * 0.45, hw * 1.0, hh * 0.05);
    shape.quadraticCurveTo(hw * 0.95, hh * 0.5, hw * 0.55, hh * 0.9);
    shape.quadraticCurveTo(hw * 0.2, hh * 1.22, 0, hh * 1.18);
    shape.quadraticCurveTo(-hw * 0.2, hh * 1.22, -hw * 0.55, hh * 0.9);
    shape.quadraticCurveTo(-hw * 0.95, hh * 0.5, -hw * 1.0, hh * 0.05);
    shape.quadraticCurveTo(-hw * 0.85, -hh * 0.45, -neck, -hh);
  } else if (kind === 'lateral') {
    const neck = hw * 0.72;
    shape.moveTo(-neck, -hh);
    shape.quadraticCurveTo(0, -hh * 1.04, neck, -hh);
    shape.quadraticCurveTo(hw * 1.02, -hh * 0.15, hw * 0.95, hh * 0.3);
    shape.quadraticCurveTo(hw * 0.7, hh * 1.1, 0, hh * 1.12);
    shape.quadraticCurveTo(-hw * 0.7, hh * 1.1, -hw * 0.95, hh * 0.3);
    shape.quadraticCurveTo(-hw * 1.02, -hh * 0.15, -neck, -hh);
  } else {
    const neck = hw * 0.78;
    shape.moveTo(-neck, -hh);
    shape.quadraticCurveTo(0, -hh * 1.02, neck, -hh);
    shape.quadraticCurveTo(hw * 1.04, -hh * 0.2, hw * 0.98, hh * 0.35);
    shape.quadraticCurveTo(hw * 0.85, hh * 1.08, 0, hh * 1.1);
    shape.quadraticCurveTo(-hw * 0.85, hh * 1.08, -hw * 0.98, hh * 0.35);
    shape.quadraticCurveTo(-hw * 1.04, -hh * 0.2, -neck, -hh);
  }

  return shape;
}

function ovalPath(cx: number, cy: number, rx: number, ry: number): THREE.Path {
  const path = new THREE.Path();
  const segs = 32;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

function openBack(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const source = geo.index ? geo.toNonIndexed() : geo;
  if (source !== geo) geo.dispose();

  const posAttr = source.attributes.position;
  const nrmAttr = source.attributes.normal;
  const positions: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i < posAttr.count; i += 3) {
    const nz =
      (nrmAttr.getZ(i) + nrmAttr.getZ(i + 1) + nrmAttr.getZ(i + 2)) / 3;
    if (nz < -0.55) continue;
    for (let k = 0; k < 3; k++) {
      positions.push(posAttr.getX(i + k), posAttr.getY(i + k), posAttr.getZ(i + k));
      normals.push(nrmAttr.getX(i + k), nrmAttr.getY(i + k), nrmAttr.getZ(i + k));
    }
  }
  source.dispose();

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.computeVertexNormals();
  return out;
}

function createOpenShellGeometry(
  id: ToothId,
  style: Exclude<ToothStyle, 'none'>,
): THREE.BufferGeometry {
  const { w, h, d } = toothDims(id);
  const depth =
    style === 'deepcut' ? d * 1.02 : style === 'window' ? d * 0.88 : d * 0.95;
  const shape = createToothShape(id, true);

  if (style === 'window') {
    // ~50% of tooth width (bevel eats a bit — oversize hole slightly)
    const rx = w * 0.28;
    const ry = h * 0.3;
    shape.holes.push(ovalPath(0, h * 0.04, rx, ry));
  } else if (style === 'deepcut') {
    shape.holes.push(ovalPath(0, -h * 0.14, w * 0.34, h * 0.14));
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: style === 'window' ? 0.006 : 0.012,
    bevelSize: style === 'window' ? 0.005 : 0.01,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geo.translate(0, 0, -depth * 0.12);
  return openBack(geo);
}

/** Rounded tooth volume that reads from any angle (not a flat extruded tile). */
function createLathePremolarGeometry(id: ToothId): THREE.BufferGeometry {
  const { h, w } = toothDims(id);
  const r = w * 0.42;
  const half = h * 0.55;
  const profile = [
    new THREE.Vector2(r * 0.35, -half),
    new THREE.Vector2(r * 0.72, -half * 0.75),
    new THREE.Vector2(r * 0.95, -half * 0.15),
    new THREE.Vector2(r * 1.0, half * 0.25),
    new THREE.Vector2(r * 0.7, half * 0.7),
    new THREE.Vector2(r * 0.28, half * 0.95),
    new THREE.Vector2(0.001, half * 1.05),
  ];
  const geo = new THREE.LatheGeometry(profile, 28);
  // Slight front-back squash so it isn't a perfect spindle
  geo.scale(1.05, 1, 0.78);
  geo.computeVertexNormals();
  return geo;
}

function createNaturalGeometry(id: ToothId): THREE.BufferGeometry {
  const { d, h } = toothDims(id);
  const kind = toothKind(id);
  if (kind === 'premolar') {
    return createLathePremolarGeometry(id);
  }
  const shape = createToothShape(id, false);
  const depth = d * 0.95;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.translate(0, 0, -depth * 0.42);
  geo.center();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp((y + h / 2) / h, 0, 1);
    pos.setX(i, x * (1 - t * 0.08));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function makeSilver(opts: { hovered?: boolean; selected?: boolean } = {}) {
  const { hovered, selected } = opts;
  return new THREE.MeshStandardMaterial({
    // Light sterling — mid-gray body, soft highlights; only crevices go dark
    color: hovered || selected ? '#e8ebf0' : '#d4d8e0',
    metalness: 1,
    roughness: hovered ? 0.15 : 0.18,
    envMapIntensity: hovered || selected ? 1.7 : 1.55,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
}

function makeEnamel(opts: { hovered?: boolean } = {}) {
  return new THREE.MeshStandardMaterial({
    // Warm matte off-white — clearly non-metal
    color: opts.hovered ? '#f7efe4' : '#f0e6d4',
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
}

function makeGum() {
  return new THREE.MeshStandardMaterial({
    color: '#b87a7a',
    metalness: 0,
    roughness: 0.92,
    envMapIntensity: 0.04,
  });
}

function GumRidge({ ids }: { ids: ToothId[] }) {
  const geo = useMemo(() => {
    if (ids.length < 2) return new THREE.BufferGeometry();
    const pts = ids.map((id) => {
      const [x, y, z] = toothPosition(id);
      return new THREE.Vector3(x, y - toothDims(id).h * 0.44, z - 0.02);
    });
    const first = pts[0].clone().add(pts[0].clone().sub(pts[1]).multiplyScalar(0.3));
    const last = pts[pts.length - 1]
      .clone()
      .add(pts[pts.length - 1].clone().sub(pts[pts.length - 2]).multiplyScalar(0.3));
    pts.unshift(first);
    pts.push(last);
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 64, 0.028, 10, false);
  }, [ids]);

  const mat = useMemo(() => makeGum(), []);
  return <mesh geometry={geo} material={mat} />;
}

function ToothUnit({
  id,
  style,
  selected,
  storeHovered,
  onSelect,
  onHover,
  interactive,
  heroMode,
  hideNatural,
  anchor,
}: {
  id: ToothId;
  style: ToothStyle;
  selected: boolean;
  storeHovered: boolean;
  onSelect: () => void;
  onHover: (id: ToothId | null) => void;
  interactive: boolean;
  heroMode: boolean;
  /** When a realistic imported base is shown, skip procedural enamel. */
  hideNatural?: boolean;
  /** Optional backdrop-aligned transform (from modelConfig.toothAnchors). */
  anchor?: ToothAnchor;
}) {
  const [localHover, setLocalHover] = useState(false);
  const hovered = localHover || storeHovered;
  const fallbackPos = toothPosition(id);
  const rotY = toothAngle(id);
  const capped = style !== 'none';

  const naturalGeo = useMemo(() => createNaturalGeometry(id), [id]);
  const shellGeos = useMemo(
    () => ({
      plain: createOpenShellGeometry(id, 'plain'),
      window: createOpenShellGeometry(id, 'window'),
      deepcut: createOpenShellGeometry(id, 'deepcut'),
    }),
    [id],
  );

  const enamel = useMemo(() => makeEnamel({ hovered: hovered && !capped }), [hovered, capped]);
  const silver = useMemo(
    () => makeSilver({ hovered, selected: selected && !heroMode }),
    [hovered, selected, heroMode],
  );

  const handlers = interactive
    ? {
        onClick: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onSelect();
        },
        onPointerOver: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          setLocalHover(true);
          onHover(id);
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
          setLocalHover(false);
          onHover(null);
          document.body.style.cursor = 'auto';
        },
      }
    : {};

  const isEnd = toothKind(id) === 'premolar';
  // Push enamel forward through window openings so warm tooth reads clearly
  const naturalZ = !capped ? (isEnd ? 0.02 : -0.008) : style === 'window' ? 0.06 : 0.045;
  const naturalScale: [number, number, number] =
    !capped
      ? isEnd
        ? [1.05, 1.08, 1.2]
        : [0.94, 0.96, 0.92]
      : style === 'window'
        ? [0.9, 0.92, 0.88]
        : [0.84, 0.86, 0.8];

  // Uncapped ends face the camera so the crown silhouette reads (not a side tile)
  const yaw = !capped && isEnd ? rotY * 0.32 : rotY;

  const groupPos = anchor?.position ?? fallbackPos;
  const groupRot = anchor?.rotation ?? ([isEnd ? 0.16 : 0.08, yaw, 0] as [number, number, number]);
  const groupScale = anchor?.scale ?? 1;

  return (
    <group position={groupPos} rotation={groupRot} scale={groupScale}>
      {!hideNatural && (
        <mesh
          name={`${id}_base`}
          geometry={naturalGeo}
          material={enamel}
          position={[0, -0.002, naturalZ]}
          scale={naturalScale}
          {...handlers}
        />
      )}

      {capped && (
        <mesh
          name={`${id}_${style}`}
          geometry={shellGeos[style as Exclude<ToothStyle, 'none'>]}
          material={silver}
          position={[0, 0.01, 0.045]}
          {...handlers}
        />
      )}

      {/* Invisible hit target when only shells + imported base are visible */}
      {hideNatural && !capped && interactive && (
        <mesh
          name={`${id}_hit`}
          geometry={naturalGeo}
          position={[0, -0.002, naturalZ]}
          scale={naturalScale}
          {...handlers}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function PlaceholderArch({
  arch,
  teeth,
  selected,
  hoveredId = null,
  onToothClick,
  onToothHover,
  autoRotate,
  interactive = true,
  mode = 'builder',
  float = false,
  hideNaturalBase = false,
  anchors,
}: {
  arch: ArchChoice;
  teeth: TeethMap;
  selected: ToothId[];
  hoveredId?: ToothId | null;
  onToothClick: (id: ToothId) => void;
  onToothHover?: (id: ToothId | null) => void;
  autoRotate: boolean;
  interactive?: boolean;
  mode?: 'builder' | 'hero';
  float?: boolean;
  /** Hide procedural enamel + gum (imported realistic base is shown instead). */
  hideNaturalBase?: boolean;
  /** When set, caps use these transforms (backdrop-aligned); skips legacy arch scale. */
  anchors?: Record<ToothId, ToothAnchor>;
}) {
  const group = useRef<THREE.Group>(null);
  const ids = toothIdsForArch(arch);
  const heroMode = mode === 'hero';
  const useAnchors = Boolean(anchors);
  // Center both arches around origin (legacy layout only)
  const baseY = useAnchors ? 0 : arch === 'both' ? 0.11 : 0.1;
  const archScale = useAnchors ? 1 : arch === 'both' ? 1.05 : 1.18;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    if (autoRotate && heroMode) {
      group.current.rotation.y = Math.sin(t * 0.28) * 0.175;
    }
    if (float) {
      group.current.position.y = baseY + Math.sin(t * 0.55) * 0.016;
    } else {
      group.current.position.y = baseY;
    }
  });

  return (
    <group ref={group} position={[0, baseY, 0]} scale={archScale}>
      {!hideNaturalBase && arch !== 'bottom' && (
        <GumRidge ids={ids.filter((id) => id[0] === 'U')} />
      )}
      {!hideNaturalBase && arch !== 'top' && (
        <GumRidge ids={ids.filter((id) => id[0] === 'L')} />
      )}
      {ids.map((id) => (
        <ToothUnit
          key={id}
          id={id}
          style={teeth[id] ?? 'none'}
          selected={selected.includes(id)}
          storeHovered={hoveredId === id}
          onSelect={() => onToothClick(id)}
          onHover={(hid) => onToothHover?.(hid)}
          interactive={interactive}
          heroMode={heroMode}
          hideNatural={hideNaturalBase}
          anchor={anchors?.[id]}
        />
      ))}
    </group>
  );
}

export function heroShowcaseTeeth(): TeethMap {
  return {
    U1: 'none',
    U2: 'window',
    U3: 'deepcut',
    U4: 'plain',
    U5: 'plain',
    U6: 'window',
    U7: 'deepcut',
    U8: 'none',
  };
}
