'use client';

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  cloneToothAnchors,
  cloneToothRegions,
  modelConfig,
  type ToothAnchor,
  type ToothRegion,
} from '@/lib/model.config';
import { useBuilderStore } from '@/store/builder-store';
import { PlaceholderArch, heroShowcaseTeeth } from './PlaceholderArch';
import { ImportedTeethBase } from './ImportedTeethBase';
import { SilverShellLayer, ToothRegionGizmos } from './SilverShellLayer';
import {
  ToothAnchorDebugGizmos,
  ToothAnchorDebugPanel,
  useDebugMode,
} from './ToothAnchorDebug';
import { ToothRegionDebugPanel } from './ToothRegionDebug';
import type { ToothId, TeethMap } from '@/lib/pricing';
import type { ArchChoice } from '@/lib/pricing.config';

function StudioEnvironment() {
  // Low env so teeth aren't washed to flat white — key/fill/rim do the shaping
  return (
    <Environment resolution={128} environmentIntensity={0.95} background={false}>
      <group>
        <Lightformer
          form="rect"
          intensity={2.4}
          position={[-1, 3.5, 2]}
          scale={[8, 3, 1]}
          color="#fff6ec"
        />
        <Lightformer
          form="rect"
          intensity={3.2}
          position={[0, 1.2, 5]}
          scale={[7, 5, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          position={[0, 1, -4]}
          scale={[8, 5, 1]}
          color="#a8b4c6"
        />
      </group>
    </Environment>
  );
}

function TeethStudioLights() {
  const keyRef = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const light = keyRef.current;
    if (!light) return;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias = -0.0002;
    light.shadow.normalBias = 0.025;
    light.shadow.radius = 4;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 14;
    light.shadow.camera.left = -3;
    light.shadow.camera.right = 3;
    light.shadow.camera.top = 3;
    light.shadow.camera.bottom = -3;
  }, []);

  return (
    <>
      {/* Soft key — upper front-left (drives form) */}
      <directionalLight
        ref={keyRef}
        position={[-2.6, 3.8, 4.2]}
        intensity={2.1}
        color="#fff3e6"
        castShadow
      />
      {/* Dim cool fill — right */}
      <directionalLight position={[3.2, 1.4, 2.0]} intensity={0.32} color="#c8d2e0" />
      {/* Rim / back */}
      <directionalLight position={[0.2, 1.8, -3.6]} intensity={0.75} color="#d0d6e0" />
      <ambientLight intensity={0.1} />
      <hemisphereLight args={['#f5efe6', '#2a2222', 0.2]} />
      <pointLight position={[-0.8, 1.1, 2.6]} intensity={0.7} color="#fff8f0" distance={7} decay={2} />
    </>
  );
}

function TransparentClear() {
  useFrame(({ gl }) => {
    gl.setClearColor(0x000000, 0);
  });
  return null;
}

function FrameArch({
  hero,
  arch,
  resetToken,
}: {
  hero: boolean;
  arch: ArchChoice;
  resetToken: number;
}) {
  const { camera, size, controls } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const cfg = modelConfig.camera;
    const both = !hero && arch === 'both';
    const [tx, ty, tz] = cfg.target;
    const target = new THREE.Vector3(tx, both ? ty - 0.04 : ty, tz);

    if (hero) {
      const aspect = size.width / Math.max(size.height, 1);
      const halfFov = THREE.MathUtils.degToRad(cam.fov) / 2;
      // Fill most of the hero frame — closer than builder so grillz read large
      const dist = Math.max(2.05, 1.15 / (0.78 * Math.tan(halfFov) * Math.max(aspect, 0.85)));
      cam.position.set(0.04 * dist, dist * 0.16, dist);
      target.y -= 0.06;
    } else {
      const [cx, cy, cz] = cfg.position;
      // Raise + pull back so biting edge isn't clipped; leave padding below
      cam.position.set(
        cx,
        both ? cy + 0.3 : cy + 0.38,
        both ? cz + 0.7 : cz + 0.85,
      );
      target.y -= both ? 0.1 : 0.15;
    }
    cam.fov = cfg.fov;
    cam.lookAt(target);
    cam.updateProjectionMatrix();

    const orbit = controls as unknown as OrbitControlsImpl | null;
    if (orbit?.target) {
      orbit.target.copy(target);
      orbit.update();
    }
  }, [camera, size.width, size.height, controls, hero, arch, resetToken]);
  return null;
}

function CaptureBridge({
  apiRef,
}: {
  apiRef: MutableRefObject<{
    screenshot: () => void;
    reset: () => void;
  } | null>;
}) {
  const { gl, scene, camera, controls } = useThree();
  useEffect(() => {
    apiRef.current = {
      screenshot: () => {
        gl.render(scene, camera);
        const url = gl.domElement.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `jmcanboy-grill-${Date.now()}.png`;
        a.click();
      },
      reset: () => {
        const orbit = controls as unknown as OrbitControlsImpl | null;
        orbit?.reset?.();
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, gl, scene, camera, controls]);
  return null;
}

class BackdropErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function Scene({
  autoRotate,
  onToothClick,
  onToothHover,
  interactive,
  forceArch,
  forceTeeth,
  forceSelected,
  mode,
  resetToken,
  debug,
  anchors,
  regions,
  backdropFailed,
  onBackdropFailed,
}: {
  autoRotate: boolean;
  onToothClick: (id: ToothId) => void;
  onToothHover: (id: ToothId | null) => void;
  interactive: boolean;
  forceArch?: ArchChoice;
  forceTeeth?: TeethMap;
  forceSelected?: ToothId[];
  mode: 'builder' | 'hero';
  resetToken: number;
  debug: boolean;
  anchors: Record<ToothId, ToothAnchor>;
  regions: Record<ToothId, ToothRegion>;
  backdropFailed: boolean;
  onBackdropFailed: () => void;
}) {
  const storeArch = useBuilderStore((s) => s.arch);
  const storeTeeth = useBuilderStore((s) => s.teeth);
  const storeSelected = useBuilderStore((s) => s.selected);
  const storeHovered = useBuilderStore((s) => s.hovered);
  const arch = forceArch ?? storeArch;
  const teeth = forceTeeth ?? storeTeeth;
  const selected = forceSelected ?? storeSelected;
  const isHero = mode === 'hero';
  const backdropUrl = modelConfig.backdropUrl;
  const showBackdrop = Boolean(backdropUrl) && !backdropFailed;
  const hideNatural = showBackdrop && modelConfig.hideProceduralBase;
  const useShell = Boolean(modelConfig.useShellGrillz) && showBackdrop;
  const hideCaps = Boolean(modelConfig.hideCaps) || useShell;
  const teethForCaps = hideCaps ? ({} as TeethMap) : teeth;
  const importedArch =
    arch === 'top' ? 'top' : arch === 'bottom' ? 'bottom' : 'both';
  const t = modelConfig.backdropTransform;

  return (
    <>
      <TransparentClear />
      <FrameArch hero={isHero} arch={arch} resetToken={resetToken} />
      <TeethStudioLights />
      <StudioEnvironment />
      <group>
        {showBackdrop && backdropUrl && (
          <BackdropErrorBoundary onError={onBackdropFailed}>
            <Suspense fallback={null}>
              <ImportedTeethBase
                url={backdropUrl}
                position={t.position}
                rotation={t.rotation}
                scale={t.scale}
                arch={importedArch}
              />
            </Suspense>
          </BackdropErrorBoundary>
        )}
        {useShell && backdropUrl && (
          <Suspense fallback={null}>
            <SilverShellLayer
              url={backdropUrl}
              position={t.position}
              rotation={t.rotation}
              scale={t.scale}
              arch={arch}
              teeth={teeth}
              regions={regions}
              onToothClick={onToothClick}
              interactive={interactive}
            />
          </Suspense>
        )}
        {!hideCaps && (
          <PlaceholderArch
            arch={arch}
            teeth={teethForCaps}
            selected={selected}
            hoveredId={isHero ? null : storeHovered}
            onToothClick={onToothClick}
            onToothHover={isHero ? undefined : onToothHover}
            autoRotate={autoRotate}
            interactive={interactive}
            mode={mode}
            float={isHero}
            hideNaturalBase={hideNatural}
            anchors={hideNatural ? anchors : undefined}
          />
        )}
        {debug && useShell && (
          <ToothRegionGizmos
            regions={regions}
            arch={arch}
            activeId={storeSelected[0] ?? null}
            position={t.position}
            rotation={t.rotation}
            scale={t.scale}
          />
        )}
        {debug && hideNatural && !useShell && (
          <ToothAnchorDebugGizmos
            anchors={anchors}
            activeId={storeSelected[0] ?? null}
          />
        )}
        {showBackdrop && (
          <ContactShadows
            position={[0, -0.35, 0.2]}
            opacity={0.35}
            scale={4}
            blur={2.2}
            far={2.5}
            resolution={256}
            color="#1a1210"
          />
        )}
      </group>
      <OrbitControls
        enablePan={false}
        enableZoom={!isHero}
        minDistance={modelConfig.camera.minDistance}
        maxDistance={modelConfig.camera.maxDistance}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.85}
        target={modelConfig.camera.target}
        makeDefault
      />
    </>
  );
}

export function GrillCanvas({
  onFallback,
  className,
  interactive = true,
  mode = 'builder',
  showViewControls = false,
}: {
  onFallback: () => void;
  className?: string;
  interactive?: boolean;
  mode?: 'builder' | 'hero';
  showViewControls?: boolean;
}) {
  const router = useRouter();
  const tapTooth = useBuilderStore((s) => s.tapTooth);
  const setHovered = useBuilderStore((s) => s.setHovered);
  const selected = useBuilderStore((s) => s.selected);
  const [autoRotate, setAutoRotate] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [anchors, setAnchors] = useState(() => cloneToothAnchors());
  const [regions, setRegions] = useState(() => cloneToothRegions());
  const debug = useDebugMode();
  const useShellDebug = Boolean(modelConfig.useShellGrillz);
  const shellRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ screenshot: () => void; reset: () => void } | null>(null);

  const forceArch = mode === 'hero' ? ('top' as const) : undefined;
  const forceTeeth = useMemo(
    () => (mode === 'hero' ? heroShowcaseTeeth() : undefined),
    [mode],
  );
  const forceSelected = mode === 'hero' ? ([] as ToothId[]) : undefined;
  const isHero = mode === 'hero';

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
    if (isHero) {
      router.push('/build');
      return;
    }
    if (!interactive) return;
    setAutoRotate(false);
    tapTooth(id);
  };

  const handleReset = useCallback(() => {
    apiRef.current?.reset();
    setResetToken((n) => n + 1);
  }, []);

  const handleFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }, []);

  const handleScreenshot = useCallback(() => {
    apiRef.current?.screenshot();
  }, []);

  return (
    <div
      ref={shellRef}
      className={`relative isolate bg-transparent ${className ?? ''}`}
      role="img"
      aria-label="3D grill style preview"
    >
      {isHero && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 48% 40% at 50% 50%, rgba(190,200,215,0.26) 0%, rgba(120,130,150,0.08) 44%, transparent 70%)',
          }}
        />
      )}

      {/* Hide dark dental-mold block above the gum */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[15] h-[55%]"
        style={{
          background: isHero
            ? 'linear-gradient(to bottom, #0a0a0b 0%, #0a0a0b 50%, rgba(10,10,11,0.7) 78%, transparent 100%)'
            : 'linear-gradient(to bottom, #0a0a0b 0%, #0a0a0b 45%, rgba(10,10,11,0.65) 75%, transparent 100%)',
        }}
      />

      {showViewControls && !isHero && (
        <div className="absolute right-2 top-2 z-20 flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={handleReset}
            className="rounded border border-border/80 bg-bg/80 px-2 py-1 text-[11px] text-silver backdrop-blur-sm hover:border-silver/50"
          >
            Reset view
          </button>
          <button
            type="button"
            onClick={handleFullscreen}
            className="rounded border border-border/80 bg-bg/80 px-2 py-1 text-[11px] text-silver backdrop-blur-sm hover:border-silver/50"
          >
            Fullscreen
          </button>
          <button
            type="button"
            onClick={handleScreenshot}
            className="rounded border border-border/80 bg-bg/80 px-2 py-1 text-[11px] text-silver backdrop-blur-sm hover:border-silver/50"
          >
            Screenshot
          </button>
        </div>
      )}

      {debug && !isHero && useShellDebug && (
        <ToothRegionDebugPanel
          regions={regions}
          onChange={setRegions}
          selectedId={selected[0] ?? null}
        />
      )}
      {debug && !isHero && !useShellDebug && (
        <ToothAnchorDebugPanel
          anchors={anchors}
          onChange={setAnchors}
          selectedId={selected[0] ?? null}
        />
      )}

      <Canvas
        camera={{
          position: [...modelConfig.camera.position],
          fov: modelConfig.camera.fov,
        }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          premultipliedAlpha: false,
          powerPreference: 'default',
          preserveDrawingBuffer: true,
        }}
        style={{ background: 'transparent', backgroundColor: 'transparent', position: 'relative', zIndex: 0 }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
          gl.domElement.style.background = 'transparent';
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          // Keep highlights ~90–95% — no pure-white clip on enamel
          gl.toneMappingExposure = 0.86;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          scene.background = null;
          scene.fog = null;
        }}
        onError={() => onFallback()}
        onPointerDown={() => {
          if (autoRotate && !isHero) setAutoRotate(false);
        }}
      >
        <Suspense fallback={null}>
          <CaptureBridge apiRef={apiRef} />
          <Scene
            autoRotate={autoRotate && !reducedMotion}
            onToothClick={handleTooth}
            onToothHover={setHovered}
            interactive={interactive || isHero}
            forceArch={forceArch}
            forceTeeth={forceTeeth}
            forceSelected={forceSelected}
            mode={mode}
            resetToken={resetToken}
            debug={debug && !isHero}
            anchors={anchors}
            regions={regions}
            backdropFailed={backdropFailed}
            onBackdropFailed={() => setBackdropFailed(true)}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
