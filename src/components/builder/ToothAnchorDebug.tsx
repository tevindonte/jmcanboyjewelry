'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ToothId } from '@/lib/pricing';
import {
  cloneToothAnchors,
  formatAnchorsForPaste,
  type ToothAnchor,
} from '@/lib/model.config';

const ALL_IDS: ToothId[] = [
  'U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8',
  'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8',
];

export function useDebugMode(): boolean {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebug(params.get('debug') === '1');
  }, []);
  return debug;
}

/**
 * HTML overlay: pick a tooth, nudge position/rotation/scale, print pasteable anchors.
 */
export function ToothAnchorDebugPanel({
  anchors,
  onChange,
  selectedId,
}: {
  anchors: Record<ToothId, ToothAnchor>;
  onChange: (next: Record<ToothId, ToothAnchor>) => void;
  selectedId: ToothId | null;
}) {
  const [id, setId] = useState<ToothId>(selectedId ?? 'U4');

  useEffect(() => {
    if (selectedId) setId(selectedId);
  }, [selectedId]);

  const a = anchors[id];

  const patch = (partial: Partial<ToothAnchor>) => {
    const next = cloneToothAnchors(anchors);
    next[id] = {
      ...next[id],
      ...partial,
      position: partial.position
        ? [...partial.position] as [number, number, number]
        : [...next[id].position] as [number, number, number],
      rotation: partial.rotation
        ? [...partial.rotation] as [number, number, number]
        : [...next[id].rotation] as [number, number, number],
    };
    onChange(next);
  };

  const setPos = (axis: 0 | 1 | 2, value: number) => {
    const position = [...a.position] as [number, number, number];
    position[axis] = value;
    patch({ position });
  };
  const setRot = (axis: 0 | 1 | 2, value: number) => {
    const rotation = [...a.rotation] as [number, number, number];
    rotation[axis] = value;
    patch({ rotation });
  };

  const print = () => {
    const text = formatAnchorsForPaste(anchors);
    console.log('%c toothAnchors (paste into model.config.ts) ', 'background:#1a1a1a;color:#c0c8d4');
    console.log(text);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  const reset = () => onChange(cloneToothAnchors());

  const rows = useMemo(
    () => [
      { label: 'pos X', value: a.position[0], min: -1.5, max: 1.5, step: 0.01, onChange: (v: number) => setPos(0, v) },
      { label: 'pos Y', value: a.position[1], min: -1.2, max: 1.2, step: 0.01, onChange: (v: number) => setPos(1, v) },
      { label: 'pos Z', value: a.position[2], min: -0.5, max: 2.2, step: 0.01, onChange: (v: number) => setPos(2, v) },
      { label: 'rot X', value: a.rotation[0], min: -1.5, max: 1.5, step: 0.01, onChange: (v: number) => setRot(0, v) },
      { label: 'rot Y', value: a.rotation[1], min: -2, max: 2, step: 0.01, onChange: (v: number) => setRot(1, v) },
      { label: 'rot Z', value: a.rotation[2], min: -1.5, max: 1.5, step: 0.01, onChange: (v: number) => setRot(2, v) },
      { label: 'scale', value: a.scale, min: 0.4, max: 1.8, step: 0.01, onChange: (v: number) => patch({ scale: v }) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional on a/id
    [a, id],
  );

  return (
    <div className="absolute bottom-2 left-2 z-30 max-h-[70%] w-[min(100%,280px)] overflow-auto rounded border border-border/80 bg-bg/90 p-3 text-[11px] text-silver shadow-lg backdrop-blur-sm">
      <p className="mb-2 font-semibold tracking-wide text-steel uppercase">
        Anchor debug
      </p>
      <label className="mb-2 flex items-center gap-2">
        <span className="text-steel">Tooth</span>
        <select
          className="flex-1 rounded border border-border bg-bg px-1 py-0.5"
          value={id}
          onChange={(e) => setId(e.target.value as ToothId)}
        >
          {ALL_IDS.map((tid) => (
            <option key={tid} value={tid}>
              {tid}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <label key={row.label} className="grid grid-cols-[52px_1fr_42px] items-center gap-1">
            <span className="text-steel">{row.label}</span>
            <input
              type="range"
              min={row.min}
              max={row.max}
              step={row.step}
              value={row.value}
              onChange={(e) => row.onChange(Number(e.target.value))}
            />
            <span className="tabular-nums text-right text-silver-bright">
              {row.value.toFixed(2)}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={print}
          className="rounded border border-silver/40 bg-silver/10 px-2 py-1 text-silver-bright hover:border-silver"
        >
          Print anchors
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-border px-2 py-1 text-steel hover:border-silver/40"
        >
          Reset
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-steel">
        Prints a pasteable `toothAnchors` block to the console (and clipboard when allowed).
      </p>
    </div>
  );
}

/** R3F helpers: world axes + colored dots at each anchor. */
export function ToothAnchorDebugGizmos({
  anchors,
  activeId,
}: {
  anchors: Record<ToothId, ToothAnchor>;
  activeId: ToothId | null;
}) {
  return (
    <group>
      <axesHelper args={[1.2]} />
      {(Object.keys(anchors) as ToothId[]).map((tid) => {
        const a = anchors[tid];
        const active = tid === activeId;
        return (
          <mesh key={tid} position={a.position} scale={active ? 0.045 : 0.028}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial
              color={active ? '#f0c040' : tid[0] === 'U' ? '#6a9cff' : '#7dcea0'}
              depthTest={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
