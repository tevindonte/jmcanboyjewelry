'use client';

import { useBuilderStore } from '@/store/builder-store';
import type { ArchChoice, ToothStyle } from '@/lib/pricing.config';
import { calculateEstimate, formatCents } from '@/lib/pricing';
import type { OrderTier } from '@/lib/pricing.config';

const ARCHES: { id: ArchChoice; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'both', label: 'Both' },
];

const STYLES: { id: ToothStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'plain', label: 'Plain' },
  { id: 'window', label: 'Window' },
  { id: 'deepcut', label: 'Deep cut' },
];

export function BuilderControls({
  tier,
  foundingLabel,
  appliedSpot,
}: {
  tier: OrderTier;
  foundingLabel: string;
  appliedSpot: number;
}) {
  const arch = useBuilderStore((s) => s.arch);
  const teeth = useBuilderStore((s) => s.teeth);
  const selected = useBuilderStore((s) => s.selected);
  const setArch = useBuilderStore((s) => s.setArch);
  const applyStyleToSelected = useBuilderStore((s) => s.applyStyleToSelected);
  const setStyle = useBuilderStore((s) => s.setStyle);
  const selectAll = useBuilderStore((s) => s.selectAll);
  const clearStyles = useBuilderStore((s) => s.clearStyles);
  const selectTop6 = useBuilderStore((s) => s.selectTop6);
  const selectBottom6 = useBuilderStore((s) => s.selectBottom6);

  const estimate = calculateEstimate({
    arch,
    teeth,
    fulfillment: 'local_impression',
    tier,
    appliedSpot,
  });

  const showFounding =
    tier === 'founding' &&
    estimate.priced &&
    estimate.foundingDiscountCents != null &&
    estimate.foundingDiscountCents > 0;

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">
          Arch
        </legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Arch">
          {ARCHES.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={arch === a.id}
              onClick={() => setArch(a.id)}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                arch === a.id
                  ? 'border-silver bg-silver/10 text-silver-bright'
                  : 'border-border text-text-muted hover:border-steel',
              ].join(' ')}
            >
              {a.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">
          Style palette
        </legend>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={selected.length === 0}
              onClick={() => {
                if (selected.length === 1) setStyle(selected[0], s.id);
                else applyStyleToSelected(s.id);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-silver hover:border-silver disabled:opacity-40"
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selected.length && applyStyleToSelected('plain')}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-silver"
        >
          Apply style to all selected
        </button>
        <button
          type="button"
          onClick={selectAll}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-silver"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearStyles}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-silver"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={selectTop6}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-silver"
        >
          Top 6
        </button>
        <button
          type="button"
          onClick={selectBottom6}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-silver"
        >
          Bottom 6
        </button>
      </div>

      <div className="rounded-md border border-border bg-bg-elevated px-4 py-3">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-text-muted">Estimate</span>
          <span className="text-right">
            {showFounding && (
              <span className="mr-2 text-sm text-steel line-through">
                {formatCents(estimate.regularToothSubtotalCents)}
              </span>
            )}
            <span className="font-display text-xl text-silver-bright">
              {estimate.priced ? formatCents(estimate.totalCents) : 'Price on request'}
            </span>
          </span>
        </div>
        <p className="mt-1 text-xs text-steel-dim">
          {estimate.selectedToothCount} tooth
          {estimate.selectedToothCount === 1 ? '' : 's'} · deposit{' '}
          {estimate.priced ? formatCents(estimate.depositCents) : '—'}
          {tier === 'founding' ? ` · ${foundingLabel}` : ''}
        </p>
        {tier === 'founding' && (
          <p className="mt-2 text-xs text-steel">
            Founding prices locked for these {foundingLabel.includes('of') ? 'slots' : '5'} only —
            soft rate while production gets dialed in.
          </p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-steel">
        This is a style preview, not your actual teeth. Fit comes from your mold.
      </p>
    </div>
  );
}
