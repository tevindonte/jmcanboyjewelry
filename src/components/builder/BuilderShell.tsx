'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { BuilderControls } from './BuilderControls';
import { ToothChart2D } from './ToothChart2D';
import { SaveDesignPanel } from './SaveDesignPanel';
import type { SiteMode } from '@/lib/site.config';
import type { OrderTier } from '@/lib/pricing.config';

const GrillCanvas = dynamic(
  () => import('./GrillCanvas').then((m) => m.GrillCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-text-muted">
        Loading 3D…
      </div>
    ),
  },
);

export function BuilderShell({
  siteMode,
  foundingRemaining,
  foundingTotal,
  appliedSpot,
}: {
  siteMode: SiteMode;
  foundingRemaining: number;
  foundingTotal: number;
  appliedSpot: number;
}) {
  const [use2d, setUse2d] = useState(false);
  const onFallback = useCallback(() => setUse2d(true), []);
  const tier: OrderTier = foundingRemaining > 0 ? 'founding' : 'standard';
  const foundingLabel =
    foundingRemaining > 0
      ? `${foundingRemaining} of ${foundingTotal} founding slots left`
      : '';

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-silver-bright">Build yours</h1>
          <button
            type="button"
            onClick={() => setUse2d((v) => !v)}
            className="text-xs text-steel hover:text-silver"
          >
            {use2d ? 'Try 3D' : 'Use 2D chart'}
          </button>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-bg-elevated sm:aspect-[4/3]">
          {use2d ? (
            <div className="flex h-full items-center justify-center p-4">
              <ToothChart2D />
            </div>
          ) : (
            <GrillCanvas onFallback={onFallback} className="h-full w-full" />
          )}
        </div>
        {!use2d && (
          <div className="mt-4 lg:hidden">
            <ToothChart2D />
          </div>
        )}
      </div>

      <div className="space-y-6">
        <BuilderControls
          tier={tier}
          foundingLabel={foundingLabel}
          appliedSpot={appliedSpot}
        />
        <SaveDesignPanel siteMode={siteMode} tier={tier} />
        <p className="text-sm text-text-muted">
          Local in <span className="text-silver">New Rochelle, NY</span>? You can skip the mail kit
          and get your impression in person — choose that at checkout.{' '}
          <Link href="/kit" className="text-silver underline-offset-2 hover:underline">
            See the kit
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
