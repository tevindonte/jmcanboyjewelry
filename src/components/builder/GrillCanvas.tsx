'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { modelConfig } from '@/lib/model.config';
import { useBuilderStore } from '@/store/builder-store';
import { PlaceholderArch } from './PlaceholderArch';
import { GlbArch } from './GlbArch';
import type { ToothId } from '@/lib/pricing';

function Scene({
  autoRotate,
  onToothClick,
}: {
  autoRotate: boolean;
  onToothClick: (id: ToothId) => void;
}) {
  const arch = useBuilderStore((s) => s.arch);
  const teeth = useBuilderStore((s) => s.teeth);
  const selected = useBuilderStore((s) => s.selected);
  const useGlb = Boolean(modelConfig.modelUrl) && !modelConfig.usePlaceholder;

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />
      <directionalLight position={[-2, 1, -2]} intensity={0.35} />
      <Environment preset="studio" environmentIntensity={0.55} />
      {useGlb && modelConfig.modelUrl ? (
        <GlbArch
          url={modelConfig.modelUrl}
          arch={arch}
          teeth={teeth}
          selected={selected}
          onToothClick={onToothClick}
          autoRotate={autoRotate}
        />
      ) : (
        <PlaceholderArch
          arch={arch}
          teeth={teeth}
          selected={selected}
          onToothClick={onToothClick}
          autoRotate={autoRotate}
        />
      )}
      <ContactShadows position={[0, -0.45, 0]} opacity={0.45} scale={6} blur={2.5} far={2} />
      <OrbitControls
        enablePan={false}
        minDistance={modelConfig.camera.minDistance}
        maxDistance={modelConfig.camera.maxDistance}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.6}
      />
    </>
  );
}

export function GrillCanvas({
  onFallback,
  className,
}: {
  onFallback: () => void;
  className?: string;
}) {
  const cycleTooth = useBuilderStore((s) => s.cycleTooth);
  const selectTooth = useBuilderStore((s) => s.selectTooth);
  const [autoRotate, setAutoRotate] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const fn = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) onFallback();
    } catch {
      onFallback();
    }
  }, [onFallback]);

  const handleTooth = (id: ToothId) => {
    setAutoRotate(false);
    cycleTooth(id);
    selectTooth(id);
  };

  return (
    <div className={className} role="img" aria-label="3D grill style preview">
      <Canvas
        camera={{
          position: modelConfig.camera.position,
          fov: modelConfig.camera.fov,
        }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a0b', 0);
        }}
        onError={() => onFallback()}
      >
        <Suspense fallback={null}>
          <Scene
            autoRotate={autoRotate && !reducedMotion}
            onToothClick={handleTooth}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
