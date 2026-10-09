'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { modelConfig } from '@/lib/model.config';

const TOOTH_COLOR = new THREE.Color(modelConfig.toothColor);
const GUM_COLOR = new THREE.Color(modelConfig.gumColor);

function weldSmooth(geo: THREE.BufferGeometry, tolerance = 0.002): THREE.BufferGeometry {
  const g = mergeVertices(geo.clone(), tolerance);
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

function paintToothVertexColors(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return;

  const pos = geo.attributes.position;
  let nrm = geo.attributes.normal;
  if (!nrm) {
    geo.computeVertexNormals();
    nrm = geo.attributes.normal;
  }
  const colors = new Float32Array(pos.count * 3);
  const size = new THREE.Vector3();
  box.getSize(size);
  const min = box.min;
  const invY = size.y > 1e-6 ? 1 / size.y : 0;
  const midX = min.x + size.x * 0.5;
  const invX = size.x > 1e-6 ? 1 / size.x : 0;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const alongGum = THREE.MathUtils.clamp((y - min.y) * invY, 0, 1);
    const edge = Math.abs((x - midX) * invX * 2);
    const edgeFactor = THREE.MathUtils.smoothstep(edge, 0.25, 1);
    const nx = nrm.getX(i);
    const nz = nrm.getZ(i);
    const facingCam = THREE.MathUtils.clamp(nz * 0.55 + 0.45, 0.5, 1);
    const gapShade = THREE.MathUtils.clamp(1 - Math.abs(nx) * 0.45, 0.62, 1);

    // Crown center lift (mid-height, facing camera) for depth
    const crownLift = (1 - Math.abs(alongGum - 0.35) * 1.8) * facingCam;
    const centerBoost = THREE.MathUtils.clamp(crownLift, 0, 1) * 0.12;

    let shade = 1;
    shade *= THREE.MathUtils.lerp(1.0, 0.72, alongGum * 1.05);
    shade *= THREE.MathUtils.lerp(1.0, 0.78, edgeFactor);
    shade *= facingCam;
    shade *= gapShade;
    shade += centerBoost;

    colors[i * 3] = THREE.MathUtils.clamp(shade, 0.55, 0.97);
    colors[i * 3 + 1] = THREE.MathUtils.clamp(shade * 0.98, 0.53, 0.96);
    colors[i * 3 + 2] = THREE.MathUtils.clamp(shade * 0.92, 0.5, 0.91);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function paintGumVertexColors(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return;
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sizeY = box.max.y - box.min.y || 1;
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) - box.min.y) / sizeY, 0, 1);
    // Soft fade: rose neck → darker backing (no hard horizontal cut)
    const shade = THREE.MathUtils.lerp(1.05, 0.08, THREE.MathUtils.smoothstep(t, 0.08, 0.85));
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade * 0.9;
    colors[i * 3 + 2] = shade * 0.88;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function makeToothMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: TOOTH_COLOR.clone(),
    roughness: 0.36,
    metalness: 0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.32,
    sheen: 0.4,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color('#f7f0e4'),
    envMapIntensity: 0.4,
    vertexColors: true,
    flatShading: false,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
    side: THREE.FrontSide,
  });
}

function makeGumMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: GUM_COLOR.clone(),
    roughness: 0.8,
    metalness: 0,
    envMapIntensity: 0.1,
    vertexColors: true,
    flatShading: false,
    map: null,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
    side: THREE.FrontSide,
  });
}

/**
 * Non-interactive scan backdrop (gums + teeth).
 * Procedural silver caps sit on top via PlaceholderArch + toothAnchors.
 */
export function ImportedTeethBase({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  arch = 'both',
}: {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  arch?: 'top' | 'bottom' | 'both';
}) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      obj.raycast = () => {};

      const name = obj.name || obj.parent?.name || '';
      const isUp = /up/i.test(name);
      const isDown = /down/i.test(name);
      if (arch === 'top' && isDown) {
        obj.visible = false;
        return;
      }
      if (arch === 'bottom' && isUp) {
        obj.visible = false;
        return;
      }
      obj.visible = true;

      const isGum = /gum/i.test(name);
      const geo = weldSmooth(obj.geometry, isGum ? 0.02 : 0.015);
      if (isGum) paintGumVertexColors(geo);
      else paintToothVertexColors(geo);
      obj.geometry = geo;
      obj.material = isGum ? makeGumMaterial() : makeToothMaterial();
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
  }, [clone, arch]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={clone} />
    </group>
  );
}

export function preloadImportedTeeth(url: string) {
  useGLTF.preload(url);
}
