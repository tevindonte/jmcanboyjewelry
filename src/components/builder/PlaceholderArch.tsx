'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ToothStyle } from '@/lib/pricing.config';
import type { TeethMap, ToothId } from '@/lib/pricing';
import { toothIdsForArch } from '@/lib/pricing';
import type { ArchChoice } from '@/lib/pricing.config';

const STYLES: Array<Exclude<ToothStyle, 'none'>> = ['plain', 'window', 'deepcut'];

function toothPosition(id: ToothId): [number, number, number] {
  const arch = id[0] as 'U' | 'L';
  const n = Number(id.slice(1));
  // Viewer L→R: index 0..7. Central incisors are U4/U5 (n=4,5 → near center).
  const t = (n - 4.5) / 4.5; // -1 .. 1-ish
  const angle = t * 0.95;
  const radius = 0.95;
  const x = Math.sin(angle) * radius;
  const z = -Math.cos(angle) * radius * 0.55;
  const y = arch === 'U' ? 0.12 : -0.22;
  return [x, y, z];
}

function ToothMeshes({
  id,
  style,
  selected,
  onSelect,
}: {
  id: ToothId;
  style: ToothStyle;
  selected: boolean;
  onSelect: () => void;
}) {
  const pos = toothPosition(id);
  const rotY = Math.atan2(pos[0], -pos[2] || 0.001);

  const silver = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#c5c9d1',
        metalness: 0.92,
        roughness: 0.28,
        envMapIntensity: 1.2,
      }),
    [],
  );

  const ghost = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3a3c42',
        metalness: 0.4,
        roughness: 0.7,
        transparent: true,
        opacity: 0.35,
      }),
    [],
  );

  const highlight = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e8ecf4',
        metalness: 0.85,
        roughness: 0.2,
        emissive: '#3a4555',
        emissiveIntensity: 0.35,
      }),
    [],
  );

  const activeMat = selected ? highlight : silver;

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* base / ghost when none */}
      <mesh
        name={`${id}_base`}
        visible={style === 'none'}
        material={ghost}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[0.14, 0.22, 0.12]} />
      </mesh>

      {STYLES.map((s) => {
        const visible = style === s;
        const depth = s === 'deepcut' ? 0.16 : s === 'window' ? 0.11 : 0.12;
        const height = s === 'deepcut' ? 0.26 : 0.22;
        return (
          <group key={s} visible={visible}>
            <mesh
              name={`${id}_${s === 'deepcut' ? 'deepcut' : s}`}
              material={activeMat}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              onPointerOver={() => {
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
              }}
            >
              <boxGeometry args={[0.15, height, depth]} />
            </mesh>
            {s === 'window' && (
              <mesh position={[0, 0.02, 0.06]} material={ghost}>
                <boxGeometry args={[0.07, 0.1, 0.02]} />
              </mesh>
            )}
            {s === 'deepcut' && (
              <mesh position={[0, -0.02, 0.08]} material={ghost}>
                <boxGeometry args={[0.1, 0.06, 0.03]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function PlaceholderArch({
  arch,
  teeth,
  selected,
  onToothClick,
  autoRotate,
}: {
  arch: ArchChoice;
  teeth: TeethMap;
  selected: ToothId[];
  onToothClick: (id: ToothId) => void;
  autoRotate: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const ids = toothIdsForArch(arch);

  useFrame((_, delta) => {
    if (!autoRotate || !group.current) return;
    group.current.rotation.y += delta * 0.15;
  });

  return (
    <group ref={group}>
      {ids.map((id) => (
        <ToothMeshes
          key={id}
          id={id}
          style={teeth[id] ?? 'none'}
          selected={selected.includes(id)}
          onSelect={() => onToothClick(id)}
        />
      ))}
      {/* subtle gum line */}
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.02, 8, 48, Math.PI]} />
        <meshStandardMaterial color="#1e1e22" metalness={0.1} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** GLB arch loader — same naming contract as Blender export. */
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
  // Lazy import pattern kept in GrillScene to avoid SSR issues with useGLTF
  return (
    <PlaceholderArch
      arch={arch}
      teeth={teeth}
      selected={selected}
      onToothClick={onToothClick}
      autoRotate={autoRotate}
    />
  );
}
