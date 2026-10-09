'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import type { ArchChoice, ToothStyle } from '@/lib/pricing.config';
import type { TeethMap, ToothId } from '@/lib/pricing';
import { toothIdsForArch } from '@/lib/pricing';
import { modelConfig } from '@/lib/model.config';

const TOOTH_RE = /^([UL][1-8])(?:_(plain|window|deepcut|base))?$/i;
const GUM_RE = /^Gums?_(Up|Down)/i;

function silverMaterial(style: ToothStyle, selected: boolean): THREE.MeshStandardMaterial {
  // Softer than mirror chrome — tooth normals + rect lightformers otherwise look like a checker
  const mat = new THREE.MeshStandardMaterial({
    color: selected ? '#e4e8ee' : style === 'window' ? '#c5ceda' : style === 'deepcut' ? '#b8c2ce' : '#d0d5de',
    metalness: 0.92,
    roughness: style === 'window' ? 0.42 : selected ? 0.28 : 0.32,
    envMapIntensity: selected ? 1.15 : 0.95,
    emissive: new THREE.Color(selected ? '#2a3340' : '#000000'),
    emissiveIntensity: selected ? 0.22 : 0,
    map: null,
    normalMap: null,
  });
  mat.needsUpdate = true;
  return mat;
}

/**
 * Named-part dental GLB: U1–U8 / L1–L8 + Gums_Up / Gums_Down.
 * Styled teeth swap to procedural silver; unstyled keep enamel textures.
 */
export function GlbArch({
  url,
  arch,
  teeth,
  selected,
  onToothClick,
  autoRotate,
}: {
  url: string;
  arch: ArchChoice;
  teeth: TeethMap;
  selected: ToothId[];
  onToothClick: (id: ToothId) => void;
  autoRotate: boolean;
}) {
  const { scene } = useGLTF(url);
  const root = useRef<THREE.Group>(null);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const ids = toothIdsForArch(arch);
  const enamelMats = useRef(new Map<string, THREE.Material>());
  const t = modelConfig.backdropTransform;

  useEffect(() => {
    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.material) return;
      const name = obj.name || '';
      if (enamelMats.current.has(name)) return;
      const src = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      enamelMats.current.set(name, src.clone());
    });
  }, [clone]);

  useEffect(() => {
    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name || '';

      const gum = name.match(GUM_RE);
      if (gum) {
        const isUp = gum[1].toLowerCase() === 'up';
        obj.visible =
          arch === 'both' || (arch === 'top' && isUp) || (arch === 'bottom' && !isUp);
        return;
      }

      const match = name.match(TOOTH_RE);
      if (!match) {
        obj.visible = false;
        return;
      }

      const id = match[1].toUpperCase() as ToothId;
      const part = (match[2]?.toLowerCase() ?? 'base') as
        | 'plain'
        | 'window'
        | 'deepcut'
        | 'base';

      if (!ids.includes(id)) {
        obj.visible = false;
        return;
      }

      const style = (teeth[id] ?? 'none') as ToothStyle;
      const isSelected = selected.includes(id);
      obj.userData.toothId = id;

      const applyEnamel = () => {
        const enamel = enamelMats.current.get(name);
        if (!enamel) return;
        const m = enamel.clone() as THREE.MeshStandardMaterial;
        if (isSelected && 'emissive' in m) {
          m.emissive = new THREE.Color('#3a4555');
          m.emissiveIntensity = 0.28;
        }
        obj.material = m;
      };

      if (match[2]) {
        if (part === 'base') {
          obj.visible = style === 'none';
          if (obj.visible) applyEnamel();
        } else {
          obj.visible = style === part;
          if (obj.visible) obj.material = silverMaterial(style, isSelected);
        }
        return;
      }

      obj.visible = true;
      if (style === 'none') applyEnamel();
      else obj.material = silverMaterial(style, isSelected);
    });
  }, [clone, teeth, selected, ids, arch]);

  useFrame((_, delta) => {
    if (!autoRotate || !root.current) return;
    root.current.rotation.y += delta * 0.15;
  });

  return (
    <group
      position={t.position}
      rotation={t.rotation}
      scale={t.scale}
    >
      <group
        ref={root}
        onClick={(e) => {
          e.stopPropagation();
          let obj: THREE.Object3D | null = e.object;
          while (obj) {
            if (obj.userData.toothId) {
              onToothClick(obj.userData.toothId as ToothId);
              return;
            }
            obj = obj.parent;
          }
        }}
      >
        <primitive object={clone} />
      </group>
    </group>
  );
}

export function preloadGlb(url: string) {
  useGLTF.preload(url);
}
