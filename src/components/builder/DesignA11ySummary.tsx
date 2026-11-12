'use client';

import { useMemo } from 'react';
import { useBuilderStore } from '@/store/builder-store';
import { pricing } from '@/lib/pricing.config';
import { formatCents } from '@/lib/pricing';

const ARCH_LABEL = {
  top: 'top arch',
  bottom: 'bottom arch',
  both: 'top and bottom arches',
} as const;

/**
 * Live text alternative for the 3D preview + estimate.
 * Updates when arch, metal, teeth, or price change.
 */
export function DesignA11ySummary({
  estimateTotalCents,
  goldQuote,
}: {
  estimateTotalCents: number | null;
  goldQuote: boolean;
}) {
  const arch = useBuilderStore((s) => s.arch);
  const metal = useBuilderStore((s) => s.metal);
  const teeth = useBuilderStore((s) => s.teeth);

  const summary = useMemo(() => {
    const metalLabel = pricing.metals[metal]?.label ?? metal;
    const selected = Object.entries(teeth)
      .filter(([, style]) => style && style !== 'none')
      .map(([id, style]) => `${id} ${style}`)
      .sort();
    const teethPart =
      selected.length === 0
        ? 'No teeth selected yet.'
        : `Selected teeth: ${selected.join(', ')}.`;
    const pricePart = goldQuote
      ? 'Solid gold is quote only.'
      : estimateTotalCents != null
        ? `Estimate total ${formatCents(estimateTotalCents)}.`
        : '';
    return `3D style preview of custom grillz, ${ARCH_LABEL[arch]}, ${metalLabel}. ${teethPart} ${pricePart}`.trim();
  }, [arch, metal, teeth, estimateTotalCents, goldQuote]);

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {summary}
    </p>
  );
}
