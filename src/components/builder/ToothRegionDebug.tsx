'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ToothId } from '@/lib/pricing';
import {
  cloneToothRegions,
  formatRegionsForPaste,
  TOOTH_ID_ORDER,
  type ToothRegion,
} from '@/lib/model.config';

/**
 * HTML overlay: nudge a0/a1/y0/y1 per tooth, print pasteable toothRegions.
 */
export function ToothRegionDebugPanel({
  regions,
  onChange,
  selectedId,
}: {
  regions: Record<ToothId, ToothRegion>;
  onChange: (next: Record<ToothId, ToothRegion>) => void;
  selectedId: ToothId | null;
}) {
  const [id, setId] = useState<ToothId>(selectedId ?? 'U4');

  useEffect(() => {
    if (selectedId) setId(selectedId);
  }, [selectedId]);

  const r = regions[id];

  const patch = (partial: Partial<ToothRegion>) => {
    const next = cloneToothRegions(regions);
    next[id] = { ...next[id], ...partial };
    onChange(next);
  };

  const print = () => {
    const text = formatRegionsForPaste(regions);
    console.log('%c toothRegions (paste into model.config.ts) ', 'background:#1a1a1a;color:#c0c8d4');
    console.log(text);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  const reset = () => onChange(cloneToothRegions());

  const rows = useMemo(
    () => [
      { label: 'a0', value: r.a0, min: -1.2, max: 1.2, step: 0.005, onChange: (v: number) => patch({ a0: v }) },
      { label: 'a1', value: r.a1, min: -1.2, max: 1.2, step: 0.005, onChange: (v: number) => patch({ a1: v }) },
      { label: 'y0', value: r.y0, min: -0.8, max: 0.5, step: 0.005, onChange: (v: number) => patch({ y0: v }) },
      { label: 'y1', value: r.y1, min: -0.8, max: 0.5, step: 0.005, onChange: (v: number) => patch({ y1: v }) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional on r/id
    [r, id],
  );

  return (
    <div className="absolute bottom-2 left-2 z-30 max-h-[70%] w-[min(100%,280px)] overflow-auto rounded border border-border/80 bg-bg/90 p-3 text-[11px] text-silver shadow-lg backdrop-blur-sm">
      <p className="mb-2 font-semibold tracking-wide text-steel uppercase">
        Region debug
      </p>
      <label className="mb-2 flex items-center gap-2">
        <span className="text-steel">Tooth</span>
        <select
          className="flex-1 rounded border border-border bg-bg px-1 py-0.5"
          value={id}
          onChange={(e) => setId(e.target.value as ToothId)}
        >
          {TOOTH_ID_ORDER.map((tid) => (
            <option key={tid} value={tid}>
              {tid}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <label key={row.label} className="grid grid-cols-[52px_1fr_48px] items-center gap-1">
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
              {row.value.toFixed(3)}
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
          Print regions
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
        Prints a pasteable `toothRegions` block to the console (and clipboard when allowed).
      </p>
    </div>
  );
}
