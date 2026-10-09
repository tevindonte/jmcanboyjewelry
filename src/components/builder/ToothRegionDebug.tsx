'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ToothId } from '@/lib/pricing';
import {
  cloneToothRegions,
  formatRegionsForPaste,
  TOOTH_ID_ORDER,
  type ToothRegion,
} from '@/lib/model.config';
import {
  applyBordersToRegions,
  bordersFromRegions,
} from '@/lib/toothArchBake';

/**
 * HTML overlay: nudge shared arch borders + y0/y1, print pasteable toothRegions.
 * Borders sit in the interproximal valleys; each tooth owns [B_i, B_{i+1}].
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
  const [prefix, setPrefix] = useState<'U' | 'L'>('U');

  useEffect(() => {
    if (selectedId) {
      setId(selectedId);
      setPrefix(selectedId[0] as 'U' | 'L');
    }
  }, [selectedId]);

  const r = regions[id];
  const borders = useMemo(
    () => bordersFromRegions(regions, prefix),
    [regions, prefix],
  );

  const patchTooth = (partial: Partial<ToothRegion>) => {
    const next = cloneToothRegions(regions);
    next[id] = { ...next[id], ...partial };
    onChange(next);
  };

  const nudgeBorder = (borderIndex: number, value: number) => {
    const nextBorders = [...borders];
    nextBorders[borderIndex] = value;
    // Keep strictly increasing
    for (let i = 1; i < nextBorders.length; i++) {
      if (nextBorders[i] <= nextBorders[i - 1]) {
        nextBorders[i] = nextBorders[i - 1] + 0.002;
      }
    }
    for (let i = nextBorders.length - 2; i >= 0; i--) {
      if (nextBorders[i] >= nextBorders[i + 1]) {
        nextBorders[i] = nextBorders[i + 1] - 0.002;
      }
    }
    onChange(applyBordersToRegions(cloneToothRegions(regions), prefix, nextBorders));
  };

  const print = () => {
    const text = formatRegionsForPaste(regions);
    console.log('%c toothRegions (paste into model.config.ts) ', 'background:#1a1a1a;color:#c0c8d4');
    console.log(text);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  const reset = () => onChange(cloneToothRegions());

  const toothNum = Number(id.slice(1));

  return (
    <div className="absolute bottom-2 left-2 z-30 max-h-[75%] w-[min(100%,300px)] overflow-auto rounded border border-border/80 bg-bg/90 p-3 text-[11px] text-silver shadow-lg backdrop-blur-sm">
      <p className="mb-2 font-semibold tracking-wide text-steel uppercase">
        Arch border debug
      </p>
      <p className="mb-2 text-[10px] leading-snug text-steel">
        Regions are colored on the mesh. Drag borders into the gaps between teeth.
      </p>
      <div className="mb-2 flex gap-1">
        {(['U', 'L'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setPrefix(p);
              setId(`${p}4` as ToothId);
            }}
            className={
              prefix === p
                ? 'rounded border border-silver bg-silver/15 px-2 py-0.5 text-silver-bright'
                : 'rounded border border-border px-2 py-0.5 text-steel'
            }
          >
            {p === 'U' ? 'Upper' : 'Lower'}
          </button>
        ))}
      </div>
      <label className="mb-2 flex items-center gap-2">
        <span className="text-steel">Tooth</span>
        <select
          className="flex-1 rounded border border-border bg-bg px-1 py-0.5"
          value={id}
          onChange={(e) => setId(e.target.value as ToothId)}
        >
          {TOOTH_ID_ORDER.filter((tid) => tid[0] === prefix).map((tid) => (
            <option key={tid} value={tid}>
              {tid}
            </option>
          ))}
        </select>
      </label>

      <p className="mb-1 text-[10px] font-semibold tracking-wide text-steel uppercase">
        Shared borders (valleys)
      </p>
      <div className="mb-2 space-y-1">
        {borders.map((b, i) => {
          const label =
            i === 0
              ? `${prefix}1 left`
              : i === 8
                ? `${prefix}8 right`
                : `${prefix}${i}|${prefix}${i + 1}`;
          const highlight = i === toothNum - 1 || i === toothNum;
          return (
            <label
              key={i}
              className={`grid grid-cols-[64px_1fr_48px] items-center gap-1 ${
                highlight ? 'text-silver-bright' : ''
              }`}
            >
              <span className="truncate text-steel">{label}</span>
              <input
                type="range"
                min={-1.2}
                max={1.2}
                step={0.002}
                value={b}
                onChange={(e) => nudgeBorder(i, Number(e.target.value))}
              />
              <span className="tabular-nums text-right text-silver-bright">
                {b.toFixed(3)}
              </span>
            </label>
          );
        })}
      </div>

      <p className="mb-1 text-[10px] font-semibold tracking-wide text-steel uppercase">
        Height ({id})
      </p>
      <div className="space-y-1.5">
        {(
          [
            { label: 'y0', value: r.y0, onChange: (v: number) => patchTooth({ y0: v }) },
            { label: 'y1', value: r.y1, onChange: (v: number) => patchTooth({ y1: v }) },
          ] as const
        ).map((row) => (
          <label key={row.label} className="grid grid-cols-[52px_1fr_48px] items-center gap-1">
            <span className="text-steel">{row.label}</span>
            <input
              type="range"
              min={-0.8}
              max={0.5}
              step={0.005}
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
