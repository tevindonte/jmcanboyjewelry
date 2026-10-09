'use client';

import { useBuilderStore, type GrillPreset } from '@/store/builder-store';
import type { ArchChoice, ToothStyle } from '@/lib/pricing.config';
import { pricing } from '@/lib/pricing.config';
import {
  calculateEstimate,
  formatCents,
  formatUsd,
  isPricedStyle,
  teethToPassMinimum,
  toothIdsForArch,
  unitPriceUsd,
  type ToothId,
} from '@/lib/pricing';
import type { OrderTier } from '@/lib/pricing.config';

const ARCHES: { id: ArchChoice; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'both', label: 'Both' },
];

const STYLE_CARDS: {
  id: Exclude<ToothStyle, 'none'>;
  label: string;
  hint: string;
}[] = [
  { id: 'plain', label: 'Plain', hint: 'Full cap' },
  { id: 'window', label: 'Window', hint: 'Open face' },
  { id: 'deepcut', label: 'Deep cut', hint: 'Low cut' },
];

const PRESETS: { id: GrillPreset; label: string; detail: string }[] = [
  { id: 'top4', label: 'Top 4', detail: 'U3–U6 plain' },
  { id: 'top6', label: 'Top 6', detail: 'U2–U7 plain' },
  { id: 'bottom6', label: 'Bottom 6', detail: 'L2–L7 plain' },
  { id: 'topBottom6', label: 'Top + Bottom 6', detail: '12 teeth plain' },
];

const STYLE_LABEL: Record<ToothStyle, string> = {
  none: 'None',
  plain: 'Plain',
  window: 'Window',
  deepcut: 'Deep cut',
};

function StyleIcon({ style }: { style: Exclude<ToothStyle, 'none'> }) {
  if (style === 'plain') {
    return (
      <svg viewBox="0 0 32 36" className="h-8 w-7" aria-hidden>
        <path
          d="M8 30 Q6 18 8 10 Q16 4 24 10 Q26 18 24 30 Z"
          fill="currentColor"
          className="text-silver/80"
        />
      </svg>
    );
  }
  if (style === 'window') {
    return (
      <svg viewBox="0 0 32 36" className="h-8 w-7" aria-hidden>
        <path
          d="M8 30 Q6 18 8 10 Q16 4 24 10 Q26 18 24 30 Z"
          fill="currentColor"
          className="text-silver/80"
        />
        <ellipse cx="16" cy="16" rx="5" ry="6" className="fill-bg" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 36" className="h-8 w-7" aria-hidden>
      <path
        d="M8 30 Q6 18 8 10 Q16 4 24 10 Q26 18 24 22 L22 30 Z"
        fill="currentColor"
        className="text-silver/80"
      />
      <path d="M10 28 Q16 22 22 28" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-bg" />
    </svg>
  );
}

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
  const pendingStyle = useBuilderStore((s) => s.pendingStyle);
  const setArch = useBuilderStore((s) => s.setArch);
  const chooseStyle = useBuilderStore((s) => s.chooseStyle);
  const removeTooth = useBuilderStore((s) => s.removeTooth);
  const clearStyles = useBuilderStore((s) => s.clearStyles);
  const applyPreset = useBuilderStore((s) => s.applyPreset);

  const estimate = calculateEstimate({
    arch,
    teeth,
    fulfillment: 'local_impression',
    tier,
    appliedSpot,
  });

  const activeId = selected.length === 1 ? selected[0] : null;
  const activeStyle = activeId ? (teeth[activeId] ?? 'none') : null;
  const pricedCount = estimate.selectedToothCount;
  const empty = pricedCount === 0;

  const moreTeeth = teethToPassMinimum(estimate);
  const minLabel = formatUsd(pricing.minimumOrder);

  const summary = toothIdsForArch(arch)
    .filter((id) => {
      const st = teeth[id] ?? 'none';
      return isPricedStyle(st);
    })
    .map((id) => {
      const style = teeth[id] as Exclude<ToothStyle, 'none'>;
      const unit = unitPriceUsd(style, appliedSpot);
      return { id, style, unit };
    });

  return (
    <div className="space-y-6">
      {empty && selected.length === 0 && !pendingStyle && (
        <p className="rounded-md border border-border/60 bg-bg-elevated/80 px-4 py-3 text-sm text-silver">
          Tap a tooth to start
        </p>
      )}

      {pendingStyle && selected.length === 0 && (
        <p className="rounded-md border border-silver/30 bg-silver/5 px-4 py-3 text-sm text-silver-bright">
          Tap a tooth to apply <span className="font-medium">{STYLE_LABEL[pendingStyle]}</span>
        </p>
      )}

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

      {/* Per-tooth style panel */}
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-medium tracking-wide text-text-muted uppercase">
            {activeId ? `Tooth ${activeId}` : 'Style'}
          </h2>
          {activeId && activeStyle && activeStyle !== 'none' && (
            <button
              type="button"
              onClick={() => removeTooth(activeId)}
              className="text-xs text-steel hover:text-silver"
            >
              Remove
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STYLE_CARDS.map((s) => {
            const unit = unitPriceUsd(s.id, appliedSpot);
            const active =
              (activeId && activeStyle === s.id) ||
              (!activeId && pendingStyle === s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => chooseStyle(s.id)}
                className={[
                  'flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-center transition-colors',
                  active
                    ? 'border-silver bg-silver/10 text-silver-bright'
                    : 'border-border text-silver hover:border-silver/60 hover:bg-bg-elevated',
                ].join(' ')}
              >
                <StyleIcon style={s.id} />
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-[10px] text-steel">{s.hint}</span>
                <span className="text-xs text-silver-bright">
                  {formatUsd(unit)}
                  <span className="text-steel"> / tooth</span>
                </span>
              </button>
            );
          })}
        </div>
        {!activeId && !pendingStyle && (
          <p className="mt-2 text-xs text-steel">
            Select a tooth, or tap a style then tap a tooth.
          </p>
        )}
      </section>

      {/* Presets */}
      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">
          Quick presets
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className="rounded-md border border-border bg-bg-elevated/50 px-3 py-3 text-left transition-colors hover:border-silver/50 hover:bg-bg-elevated"
            >
              <span className="block text-sm font-medium text-silver-bright">{p.label}</span>
              <span className="mt-0.5 block text-[11px] text-steel">{p.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={clearStyles}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-silver"
        >
          Clear all
        </button>
      </div>

      {/* Summary list */}
      {summary.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">
            Selected
          </h2>
          <ul className="divide-y divide-border/60 rounded-md border border-border/60">
            {summary.map((row) => (
              <SummaryRow
                key={row.id}
                id={row.id}
                style={row.style}
                unit={row.unit}
                onRemove={() => removeTooth(row.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Estimate */}
      <div className="rounded-md border border-border bg-bg-elevated px-4 py-3">
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-steel">
          <span>Plain {formatUsd(pricing.perTooth.plain)}</span>
          <span>Window {formatUsd(pricing.perTooth.window)}</span>
          <span>Deep cut {formatUsd(pricing.perTooth.deepcut)}</span>
        </div>

        <p className="mb-2 text-sm text-text-muted">Estimate</p>

        {empty ? (
          <>
            <p className="font-display text-xl text-silver-bright">{formatCents(0)}</p>
            <p className="mt-1 text-xs text-steel-dim">
              Add teeth to see your total. Min order {minLabel}
              {tier === 'founding' && pricing.founding.discountPercent != null
                ? ` · ${pricing.founding.discountPercent}% founding off`
                : ''}
              .
            </p>
          </>
        ) : (
          <>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-steel">
                  Subtotal ({pricedCount} {pricedCount === 1 ? 'tooth' : 'teeth'})
                </dt>
                <dd className="text-silver">
                  {formatCents(estimate.regularToothSubtotalCents)}
                </dd>
              </div>
              {estimate.foundingDiscountCents != null &&
                estimate.foundingDiscountCents > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-steel">
                      Founding discount ({pricing.founding.discountPercent}%)
                    </dt>
                    <dd className="text-silver">
                      −{formatCents(estimate.foundingDiscountCents)}
                    </dd>
                  </div>
                )}
              {estimate.minimumApplied && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-steel">After discount</dt>
                    <dd className="text-silver">
                      {formatCents(estimate.preMinimumCents)}
                    </dd>
                  </div>
                  <div className="rounded-md border border-border/50 bg-bg-soft/40 px-2.5 py-2 text-xs leading-snug text-steel">
                    Minimum order {minLabel} — total raised from{' '}
                    {formatCents(estimate.preMinimumCents)} to meet the floor.
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-border/50 pt-2">
                <dt className="text-text-muted">Total</dt>
                <dd className="font-display text-xl text-silver-bright">
                  {formatCents(estimate.totalCents ?? 0)}
                </dd>
              </div>
            </dl>

            {estimate.minimumApplied && moreTeeth > 0 && (
              <p className="mt-2 text-xs text-steel">
                Add {moreTeeth} more {moreTeeth === 1 ? 'tooth' : 'teeth'} to go past the
                minimum
              </p>
            )}

            <p className="mt-2 text-xs text-steel-dim">
              Deposit {formatCents(estimate.depositCents)}
              {tier === 'founding' ? ` · ${foundingLabel}` : ''}
            </p>
          </>
        )}
      </div>

      <p className="text-xs leading-relaxed text-steel">
        Style preview only — fit comes from your mold.
      </p>
    </div>
  );
}

function SummaryRow({
  id,
  style,
  unit,
  onRemove,
}: {
  id: ToothId;
  style: Exclude<ToothStyle, 'none'>;
  unit: number | null;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-silver-bright">
        {id}{' '}
        <span className="text-steel">· {STYLE_LABEL[style]}</span>
      </span>
      <span className="flex items-center gap-3">
        <span className="text-silver">{formatUsd(unit)}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-steel hover:text-silver"
          aria-label={`Remove ${id}`}
        >
          Remove
        </button>
      </span>
    </li>
  );
}
