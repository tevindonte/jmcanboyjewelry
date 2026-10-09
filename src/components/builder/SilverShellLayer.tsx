'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { TeethMap, ToothId } from '@/lib/pricing';
import type { ToothStyle } from '@/lib/pricing.config';
import type { ArchChoice } from '@/lib/pricing.config';
import {
  modelConfig,
  toothIndex,
  TOOTH_ID_ORDER,
  type ToothRegion,
} from '@/lib/model.config';
import {
  bakeToothIdAttribute,
  seedRegionsFromValleys,
} from '@/lib/toothArchBake';

/**
 * Caps-only studio env: light-grey body fill + softbox strip lights.
 * Not applied to scene.environment — only material.envMap.
 * Labial faces (+Z) must sample a light grey card or metalness×env → black chrome.
 */
function buildSilverStudioEnv(gl: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  // Neutral greys only — no blue tint in reflections
  scene.background = new THREE.Color(0x8a8a8a);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0x9a9a9a,
      side: THREE.BackSide,
    }),
  );
  scene.add(box);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({ color: 0x242424 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4;
  scene.add(floor);

  const overhead = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 5),
    new THREE.MeshBasicMaterial({ color: 0xd6d6d6 }),
  );
  overhead.rotation.x = Math.PI / 2;
  overhead.position.set(0, 6.2, 0.8);
  scene.add(overhead);

  const softbox = (
    w: number,
    h: number,
    color: number,
    pos: [number, number, number],
    lookAt: [number, number, number],
  ) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(...lookAt);
    scene.add(m);
  };

  softbox(16, 12, 0xd4d4d8, [0, 1.0, 8], [0, 0.2, 0]);
  softbox(12, 8, 0xc0c0c4, [0, -0.6, 7.0], [0, 0.35, 0]);
  softbox(18, 14, 0xb0b0b4, [0, 2.0, 9.5], [0, 0.1, 0]);

  softbox(5.5, 1.5, 0xf2f2f2, [-3.8, 3.5, 6.0], [0, 0.2, 0]);
  softbox(4.8, 1.3, 0xe8e8e8, [4.2, 2.9, 5.2], [0, 0.15, 0]);
  softbox(4.5, 1.2, 0xdcdcdc, [0.2, 4.6, -3.8], [0, 0.25, 0]);

  softbox(8, 6, 0x5a5a5a, [-7.5, 1.2, 1.5], [0, 0.2, 0]);
  softbox(8, 6, 0x565656, [7.5, 1.2, 1.5], [0, 0.2, 0]);
  softbox(12, 6, 0x3a3a3a, [0, 1.0, -7.5], [0, 0.2, 0]);

  const pmrem = new THREE.PMREMGenerator(gl);
  const rt = pmrem.fromScene(scene, 0.08);
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return rt.texture;
}

const STYLE_NONE = 0;
const STYLE_PLAIN = 1;
const STYLE_WINDOW = 2;
const STYLE_DEEPCUT = 3;

function styleCode(s: ToothStyle | undefined): number {
  if (s === 'plain') return STYLE_PLAIN;
  if (s === 'window') return STYLE_WINDOW;
  if (s === 'deepcut') return STYLE_DEEPCUT;
  return STYLE_NONE;
}

function weldSmooth(geo: THREE.BufferGeometry, tolerance = 0.015): THREE.BufferGeometry {
  const g = mergeVertices(geo.clone(), tolerance);
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

function packRegions(regions: Record<ToothId, ToothRegion>) {
  const a0 = new Float32Array(16);
  const a1 = new Float32Array(16);
  const y0 = new Float32Array(16);
  const y1 = new Float32Array(16);
  for (const id of TOOTH_ID_ORDER) {
    const i = toothIndex(id);
    const r = regions[id];
    a0[i] = r.a0;
    a1[i] = r.a1;
    y0[i] = r.y0;
    y1[i] = r.y1;
  }
  return { a0, a1, y0, y1 };
}

function packStyles(teeth: TeethMap, arch: ArchChoice) {
  const styles = new Float32Array(16);
  for (const id of TOOTH_ID_ORDER) {
    const i = toothIndex(id);
    const isUp = id[0] === 'U';
    if (arch === 'top' && !isUp) {
      styles[i] = STYLE_NONE;
      continue;
    }
    if (arch === 'bottom' && isUp) {
      styles[i] = STYLE_NONE;
      continue;
    }
    styles[i] = styleCode(teeth[id]);
  }
  return styles;
}

type ShellShader = {
  uniforms: {
    uStyles: { value: Float32Array };
    uA0: { value: Float32Array };
    uA1: { value: Float32Array };
    uY0: { value: Float32Array };
    uY1: { value: Float32Array };
    uInflate: { value: number };
    uDebugRegions?: { value: number };
    [key: string]: { value: Float32Array | number } | undefined;
  };
};

function createSilverMaterial(
  envMap: THREE.Texture,
  inflate: number,
  debugRegions: boolean,
): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#D4D4D8'),
    metalness: 1,
    roughness: 0.14,
    clearcoat: 0,
    clearcoatRoughness: 0,
    envMap,
    envMapIntensity: 1.55,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uInflate = { value: inflate };
    shader.uniforms.uStyles = { value: new Float32Array(16) };
    shader.uniforms.uA0 = { value: new Float32Array(16) };
    shader.uniforms.uA1 = { value: new Float32Array(16) };
    shader.uniforms.uY0 = { value: new Float32Array(16) };
    shader.uniforms.uY1 = { value: new Float32Array(16) };
    shader.uniforms.uDebugRegions = { value: debugRegions ? 1 : 0 };

    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        /* glsl */ `
        uniform float uInflate;
        attribute float aToothId;
        attribute float aToothU;
        varying vec3 vShellPos;
        varying vec3 vShellNormal;
        varying float vToothId;
        varying float vToothU;
        void main() {
        `,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        vShellPos = position;
        vShellNormal = objectNormal;
        vToothId = aToothId;
        vToothU = aToothU;
        transformed += normalize(objectNormal) * uInflate;
        `,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        /* glsl */ `
        uniform float uStyles[16];
        uniform float uA0[16];
        uniform float uA1[16];
        uniform float uY0[16];
        uniform float uY1[16];
        uniform float uDebugRegions;
        varying vec3 vShellPos;
        varying vec3 vShellNormal;
        varying float vToothId;
        varying float vToothU;

        float sdRoundBox(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
        }

        // Per-tooth rounded cap in local (u,v): wide at gum, narrower + rounder at bite
        float toothCapSDF(float u, float v) {
          float vv = clamp(v, 0.0, 1.0);
          float hx = mix(0.52, 0.44, vv);
          float hy = 0.505;
          float corner = mix(0.05, 0.26, smoothstep(0.2, 0.95, vv));
          vec2 p = vec2(u - 0.5, v - 0.5);
          return sdRoundBox(p, vec2(hx, hy), min(corner, min(hx, hy) - 0.02));
        }

        vec3 debugToothColor(float tid) {
          float h = fract(tid * 0.6180339887);
          float s = 0.75;
          float v = 0.92;
          float i = floor(h * 6.0);
          float f = fract(h * 6.0);
          float p = v * (1.0 - s);
          float q = v * (1.0 - f * s);
          float t = v * (1.0 - (1.0 - f) * s);
          if (i < 1.0) return vec3(v, t, p);
          if (i < 2.0) return vec3(q, v, p);
          if (i < 3.0) return vec3(p, v, t);
          if (i < 4.0) return vec3(p, q, v);
          if (i < 5.0) return vec3(t, p, v);
          return vec3(v, p, q);
        }

        void main() {
          float groove = 0.0;
          float seam = 0.0;
          float rim = 0.0;
        `,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        /* glsl */ `
        #include <clipping_planes_fragment>
        float y = vShellPos.y;
        int hit = int(floor(vToothId + 0.5));
        if (hit < 0 || hit > 15) discard;

        float hitStyle = uStyles[hit];
        // Debug: show every region; production: only selected styles
        if (uDebugRegions < 0.5 && hitStyle < 0.5) discard;

        float y0 = uY0[hit];
        float y1 = uY1[hit];
        if (y < y0 - 0.03 || y > y1 + 0.03) discard;

        float u = clamp(vToothU, -0.15, 1.15);
        float v = (y - y0) / max(y1 - y0, 1e-4);
        float bestD = toothCapSDF(u, v);

        float aa = max(fwidth(bestD) * 0.6, 0.0015);
        if (bestD > aa) discard;

        if (uDebugRegions > 0.5) {
          // Solid region paint — skip silver lighting path
        } else {
          float faceDot = vShellNormal.z;

          if (hitStyle > 1.5 && hitStyle < 2.5 && faceDot > -0.15) {
            vec2 wp = vec2(u - 0.5, v - 0.48);
            float wd = sdRoundBox(wp, vec2(0.30, 0.28), 0.08);
            float waa = max(fwidth(wd) * 0.6, 0.0015);
            if (wd < -waa) discard;
          }

          if (hitStyle > 2.5 && faceDot > 0.1) {
            float g1 = 1.0 - smoothstep(0.0, 0.022, abs(v - 0.36));
            float g2 = 1.0 - smoothstep(0.0, 0.022, abs(v - 0.52));
            float g3 = 1.0 - smoothstep(0.0, 0.022, abs(v - 0.68));
            groove = max(g1, max(g2, g3));
            groove *= smoothstep(0.06, 0.16, u) * smoothstep(0.06, 0.16, 1.0 - u);
            groove *= smoothstep(0.02, 0.0, bestD);
          }

          float sideSeam = max(
            1.0 - smoothstep(0.0, 0.04, u),
            1.0 - smoothstep(0.0, 0.04, 1.0 - u)
          );
          seam = sideSeam * 0.4;
          rim = (1.0 - smoothstep(0.0, 0.045, -bestD)) * step(bestD, 0.0);
        }
        `,
      )
      .replace(
        '#include <lights_fragment_begin>',
        /* glsl */ `
        #include <lights_fragment_begin>
        if (uDebugRegions < 0.5) {
          reflectedLight.directDiffuse = vec3(0.0);
          reflectedLight.directSpecular = vec3(0.0);
        }
        `,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
        if (uDebugRegions > 0.5) {
          outgoingLight = debugToothColor(float(hit));
          // Darken near borders so gaps read clearly
          outgoingLight *= mix(0.55, 1.0, smoothstep(0.0, 0.08, min(u, 1.0 - u)));
        } else {
          if (groove > 0.01) {
            outgoingLight *= mix(1.0, 0.28, groove);
            outgoingLight = mix(outgoingLight, vec3(0.14), groove * 0.75);
          }
          outgoingLight += vec3(0.35) * rim;
          outgoingLight *= mix(1.0, 0.42, seam * 0.95);
          outgoingLight = min(outgoingLight, vec3(0.84));
          float luma = (outgoingLight.r + outgoingLight.g + outgoingLight.b) / 3.0;
          outgoingLight = vec3(luma);
        }
        #include <opaque_fragment>
        `,
      );

    mat.userData.shader = shader as unknown as ShellShader;
  };

  mat.customProgramCacheKey = () =>
    debugRegions ? 'silver-shell-arch-v7-debug' : 'silver-shell-arch-v7';
  return mat;
}

function pushUniforms(
  mat: THREE.MeshPhysicalMaterial,
  regions: Record<ToothId, ToothRegion>,
  teeth: TeethMap,
  arch: ArchChoice,
  debugRegions: boolean,
) {
  const shader = mat.userData.shader as ShellShader | undefined;
  if (!shader?.uniforms?.uStyles) return;
  shader.uniforms.uStyles.value = packStyles(teeth, arch);
  const packed = packRegions(regions);
  shader.uniforms.uA0.value = packed.a0;
  shader.uniforms.uA1.value = packed.a1;
  shader.uniforms.uY0.value = packed.y0;
  shader.uniforms.uY1.value = packed.y1;
  shader.uniforms.uInflate.value = modelConfig.shellInflate;
  if (shader.uniforms.uDebugRegions) {
    shader.uniforms.uDebugRegions.value = debugRegions ? 1 : 0;
  }
}

function regionAtPoint(
  p: THREE.Vector3,
  regions: Record<ToothId, ToothRegion>,
  arch: ArchChoice,
): ToothId | null {
  const ang = Math.atan2(p.x, p.z);
  // Prefer selected/styled teeth first is not needed — any region for picking
  for (const id of TOOTH_ID_ORDER) {
    const isUp = id[0] === 'U';
    if (arch === 'top' && !isUp) continue;
    if (arch === 'bottom' && isUp) continue;
    const r = regions[id];
    if (ang >= r.a0 && ang <= r.a1 && p.y >= r.y0 && p.y <= r.y1) return id;
  }
  return null;
}

/**
 * Duplicated teeth mesh with inflated silver shell.
 * Tooth membership is baked per-vertex along the arch curve (valley borders).
 */
export function SilverShellLayer({
  url,
  position,
  rotation,
  scale,
  arch,
  teeth,
  regions,
  onToothClick,
  interactive = true,
  debugRegions = false,
  onRegionsSeeded,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  arch: ArchChoice;
  teeth: TeethMap;
  regions: Record<ToothId, ToothRegion>;
  onToothClick: (id: ToothId) => void;
  interactive?: boolean;
  /** Color each tooth region (for ?debug=1 border tuning). */
  debugRegions?: boolean;
  /** Called once after valley borders are auto-seeded from the mesh. */
  onRegionsSeeded?: (next: Record<ToothId, ToothRegion>) => void;
}) {
  const { scene } = useGLTF(url);
  const { gl } = useThree();
  const matRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const seededRef = useRef(false);

  // Dedicated env for silver only — does not touch scene.environment
  const envMap = useMemo(() => buildSilverStudioEnv(gl), [gl]);

  useEffect(() => {
    return () => {
      envMap.dispose();
    };
  }, [envMap]);

  const toothGeos = useMemo(() => {
    const geos: { name: string; geometry: THREE.BufferGeometry; isUp: boolean }[] = [];
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name || '';
      if (!/teeth/i.test(name)) return;
      if (/gum/i.test(name)) return;
      const isUp = /up/i.test(name);
      const geometry = weldSmooth(obj.geometry, 0.015);
      geos.push({ name, geometry, isUp });
    });
    return geos;
  }, [scene]);

  // Optionally auto-seed valley borders once, then bake toothId on region changes
  useEffect(() => {
    let bakeRegions = regions;
    if (
      !seededRef.current &&
      toothGeos.length > 0 &&
      modelConfig.autoSeedArchBorders
    ) {
      seededRef.current = true;
      let next = regions;
      for (const g of toothGeos) {
        const pos = g.geometry.getAttribute('position');
        if (!pos) continue;
        next = seedRegionsFromValleys(pos.array, next, g.isUp);
      }
      bakeRegions = next;
      onRegionsSeeded?.(next);
    } else if (!seededRef.current) {
      seededRef.current = true;
    }
    for (const g of toothGeos) {
      bakeToothIdAttribute(g.geometry, bakeRegions, g.isUp);
    }
  }, [toothGeos, regions, onRegionsSeeded]);

  const material = useMemo(
    () => createSilverMaterial(envMap, modelConfig.shellInflate, debugRegions),
    [envMap, debugRegions],
  );

  useEffect(() => {
    matRef.current = material;
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    pushUniforms(material, regions, teeth, arch, debugRegions);
    material.needsUpdate = true;
  }, [material, regions, teeth, arch, debugRegions]);

  useEffect(() => {
    let frames = 0;
    let id = 0;
    const tick = () => {
      pushUniforms(material, regions, teeth, arch, debugRegions);
      frames += 1;
      if (frames < 90 && !material.userData.shader) {
        id = requestAnimationFrame(tick);
      }
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [material, regions, teeth, arch, debugRegions]);

  const visibleGeos = toothGeos.filter((g) => {
    if (arch === 'top') return g.isUp;
    if (arch === 'bottom') return !g.isUp;
    return true;
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {visibleGeos.map((g) => (
        <mesh
          key={g.name}
          geometry={g.geometry}
          material={material}
          castShadow={false}
          receiveShadow={false}
          onClick={(e) => {
            if (!interactive) return;
            e.stopPropagation();
            const local = e.object.worldToLocal(e.point.clone());
            const id = regionAtPoint(local, regions, arch);
            if (id) onToothClick(id);
          }}
        />
      ))}
    </group>
  );
}

function BoundaryLines({
  a,
  y0,
  y1,
  color,
  radius = 0.9,
}: {
  a: number;
  y0: number;
  y1: number;
  color: string;
  radius?: number;
}) {
  const positions = useMemo(() => {
    const x0 = Math.sin(a) * radius * 0.5;
    const z0 = Math.cos(a) * radius * 0.5;
    const x1 = Math.sin(a) * radius * 1.2;
    const z1 = Math.cos(a) * radius * 1.2;
    return new Float32Array([
      x0, y0, z0, x1, y0, z1,
      x1, y0, z1, x1, y1, z1,
      x1, y1, z1, x0, y1, z0,
      x0, y1, z0, x0, y0, z0,
    ]);
  }, [a, y0, y1, radius]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={color} depthTest={false} transparent opacity={0.85} />
    </lineSegments>
  );
}

/** Debug: arch-boundary lines + labels for each tooth region. */
export function ToothRegionGizmos({
  regions,
  arch,
  activeId,
  position,
  rotation,
  scale,
}: {
  regions: Record<ToothId, ToothRegion>;
  arch: ArchChoice;
  activeId: ToothId | null;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const items = TOOTH_ID_ORDER.filter((id) => {
    if (arch === 'top') return id[0] === 'U';
    if (arch === 'bottom') return id[0] === 'L';
    return true;
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {items.map((id) => {
        const r = regions[id];
        const active = id === activeId;
        const color = active ? '#f0c040' : id[0] === 'U' ? '#6a9cff' : '#7dcea0';
        const midA = (r.a0 + r.a1) * 0.5;
        const lx = Math.sin(midA) * 0.95;
        const lz = Math.cos(midA) * 0.95;
        const ly = (r.y0 + r.y1) * 0.5;
        return (
          <group key={id}>
            <BoundaryLines a={r.a0} y0={r.y0} y1={r.y1} color={color} />
            <BoundaryLines a={r.a1} y0={r.y0} y1={r.y1} color={color} />
            <Html position={[lx, ly, lz]} center style={{ pointerEvents: 'none' }}>
              <span
                style={{
                  color,
                  fontSize: 10,
                  fontWeight: 700,
                  textShadow: '0 0 3px #000',
                  whiteSpace: 'nowrap',
                }}
              >
                {id}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
