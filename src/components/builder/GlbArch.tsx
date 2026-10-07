'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import type { ArchChoice, ToothStyle } from '@/lib/pricing.config';
// ToothStyle used for cast of teeth map values
import type { TeethMap, ToothId } from '@/lib/pricing';
import { toothIdsForArch } from '@/lib/pricing';

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

  useEffect(() => {
    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name;
      const match = name.match(/^([UL][1-8])_(plain|window|deepcut|base)$/);
      if (!match) {
        obj.visible = false;
        return;
      }
      const id = match[1] as ToothId;
      const part = match[2] as 'plain' | 'window' | 'deepcut' | 'base';
      if (!ids.includes(id)) {
        obj.visible = false;
        return;
      }
      const style = (teeth[id] ?? 'none') as ToothStyle;
      if (part === 'base') {
        obj.visible = style === 'none';
      } else {
        obj.visible = style === part;
      }

      const isSelected = selected.includes(id);
      if (obj.material && 'emissive' in obj.material) {
        const mat = (obj.material as THREE.MeshStandardMaterial).clone();
        mat.emissive = new THREE.Color(isSelected ? '#3a4555' : '#000000');
        mat.emissiveIntensity = isSelected ? 0.35 : 0;
        obj.material = mat;
      }

      obj.userData.toothId = id;
    });
  }, [clone, teeth, selected, ids]);

  useFrame((_, delta) => {
    if (!autoRotate || !root.current) return;
    root.current.rotation.y += delta * 0.15;
  });

  return (
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
  );
}

export function preloadGlb(url: string) {
  useGLTF.preload(url);
}
