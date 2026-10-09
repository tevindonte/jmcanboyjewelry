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

/**
 * Caps-only studio env: light-grey body fill + softbox strip lights.
 * Not applied to scene.environment — only material.envMap.
 * Labial faces (+Z) must sample a light grey card or metalness×env → black chrome.
 */
function buildSilverStudioEnv(gl: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8a909a);

  // Room walls — light cool grey (silver body under metalness 1)
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0x9aa2ae,
      side: THREE.BackSide,
    }),
  );
  scene.add(box);

  // Darker floor for contrast in downward reflections
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({ color: 0x22262c }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4;
  scene.add(floor);

  // Cool-white overhead
  const overhead = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 5),
    new THREE.MeshBasicMaterial({ color: 0xd8dde6 }),
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

  // Large frontal fill (+Z) — smile faces sample this → sterling body grey
  softbox(16, 12, 0xc9ced6, [0, 1.0, 8], [0, 0.2, 0]);
  softbox(12, 8, 0xb8bec8, [0, -0.6, 7.0], [0, 0.35, 0]);
  softbox(18, 14, 0xaeb4be, [0, 2.0, 9.5], [0, 0.1, 0]);

  // Softbox strip lights — brighter than fill for clear polished contrast
  softbox(5.5, 1.5, 0xf2f4f8, [-3.8, 3.5, 6.0], [0, 0.2, 0]);
  softbox(4.8, 1.3, 0xe8ecf2, [4.2, 2.9, 5.2], [0, 0.15, 0]);
  softbox(4.5, 1.2, 0xdce2ea, [0.2, 4.6, -3.8], [0, 0.25, 0]);

  // Side / back fill — shadowed metal → dark grey (not black)
  softbox(8, 6, 0x585f6c, [-7.5, 1.2, 1.5], [0, 0.2, 0]);
  softbox(8, 6, 0x545b68, [7.5, 1.2, 1.5], [0, 0.2, 0]);
  softbox(12, 6, 0x3a4048, [0, 1.0, -7.5], [0, 0.2, 0]);

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
  uniforms: Record<string, { value: Float32Array | number }>;
};

function createSilverMaterial(envMap: THREE.Texture, inflate: number): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#C9CED6'),
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

    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        /* glsl */ `
        uniform float uInflate;
        varying vec3 vShellPos;
        varying vec3 vShellNormal;
        void main() {
        `,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        vShellPos = position;
        vShellNormal = objectNormal;
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
        varying vec3 vShellPos;
        varying vec3 vShellNormal;

        float sdRoundBox(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
        }

        void main() {
        `,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        /* glsl */ `
        #include <clipping_planes_fragment>
        float ang = atan(vShellPos.x, vShellPos.z);
        float y = vShellPos.y;
        int hit = -1;
        float hitStyle = 0.0;
        float t0 = 0.0;
        float t1 = 0.0;
        float yLo = 0.0;
        float yHi = 0.0;
        for (int i = 0; i < 16; i++) {
          float st = uStyles[i];
          if (st < 0.5) continue;
          if (ang >= uA0[i] && ang <= uA1[i] && y >= uY0[i] && y <= uY1[i]) {
            hit = i;
            hitStyle = st;
            t0 = uA0[i]; t1 = uA1[i];
            yLo = uY0[i]; yHi = uY1[i];
            break;
          }
        }
        if (hit < 0) discard;

        float u = (ang - t0) / max(t1 - t0, 1e-4);
        float v = (y - yLo) / max(yHi - yLo, 1e-4);
        float faceDot = vShellNormal.z;

        // Window: rounded opening — solid rim ~18% of tooth width
        // Apply on front-ish faces; skip deep lingual so shell keeps a back wall
        if (hitStyle > 1.5 && hitStyle < 2.5 && faceDot > -0.15) {
          vec2 p = vec2(u - 0.5, v - 0.48);
          float d = sdRoundBox(p, vec2(0.34, 0.32), 0.09);
          if (d < 0.0) discard;
        }

        // Deep cut: 3 horizontal groove lines on labial face
        float groove = 0.0;
        if (hitStyle > 2.5 && faceDot > 0.1) {
          float g1 = 1.0 - smoothstep(0.0, 0.022, abs(v - 0.36));
          float g2 = 1.0 - smoothstep(0.0, 0.022, abs(v - 0.52));
          float g3 = 1.0 - smoothstep(0.0, 0.022, abs(v - 0.68));
          groove = max(g1, max(g2, g3));
          groove *= smoothstep(0.04, 0.12, u) * smoothstep(0.04, 0.12, 1.0 - u);
        }
        `,
      )
      .replace(
        '#include <lights_fragment_begin>',
        /* glsl */ `
        #include <lights_fragment_begin>
        // Caps: drop scene key/fill — body + highlights come from dedicated envMap only
        reflectedLight.directDiffuse = vec3(0.0);
        reflectedLight.directSpecular = vec3(0.0);
        `,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
        if (groove > 0.01) {
          outgoingLight *= mix(1.0, 0.28, groove);
          outgoingLight = mix(outgoingLight, vec3(0.12, 0.13, 0.15), groove * 0.75);
        }
        // Soft-clamp highlights so ACES doesn't blow silver to pearl-white
        outgoingLight = min(outgoingLight, vec3(0.84));
        // Neutral grey — no blue chrome, no warm pearl
        float luma = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
        outgoingLight = mix(outgoingLight, vec3(luma), 0.35);
        #include <opaque_fragment>
        `,
      );

    mat.userData.shader = shader as ShellShader;
  };

  mat.customProgramCacheKey = () => 'silver-shell-mat-v9';
  return mat;
}

function pushUniforms(
  mat: THREE.MeshPhysicalMaterial,
  regions: Record<ToothId, ToothRegion>,
  teeth: TeethMap,
  arch: ArchChoice,
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
 * Fragments outside selected tooth regions are discarded in the shader.
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
}) {
  const { scene } = useGLTF(url);
  const { gl } = useThree();
  const matRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

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
      geos.push({ name, geometry: weldSmooth(obj.geometry, 0.015), isUp });
    });
    return geos;
  }, [scene]);

  const material = useMemo(
    () => createSilverMaterial(envMap, modelConfig.shellInflate),
    [envMap],
  );

  useEffect(() => {
    matRef.current = material;
    return () => {
      material.dispose();
    };
  }, [material]);

  // Push uniforms every frame until shader compiles, then on changes
  useEffect(() => {
    pushUniforms(material, regions, teeth, arch);
    material.needsUpdate = true;
  }, [material, regions, teeth, arch]);

  // Retry push after compile (onBeforeCompile sets userData.shader lazily)
  useEffect(() => {
    let frames = 0;
    let id = 0;
    const tick = () => {
      pushUniforms(material, regions, teeth, arch);
      frames += 1;
      if (frames < 90 && !material.userData.shader) {
        id = requestAnimationFrame(tick);
      }
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [material, regions, teeth, arch]);

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
