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
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-text-muted">
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
  const [webglFailed, setWebglFailed] = useState(false);
  const onFallback = useCallback(() => setWebglFailed(true), []);
  const tier: OrderTier = foundingRemaining > 0 ? 'founding' : 'standard';
  const foundingLabel =
    foundingRemaining > 0
      ? `${foundingRemaining} of ${foundingTotal} founding slots left`
      : '';

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
      {/* Visual column: 2D chart + 3D */}
      <div className="min-w-0 space-y-4">
        <h1 className="font-display text-2xl font-bold text-silver-bright">Build yours</h1>

        {/* Mobile: 2D first. Desktop: chart beside / above 3D in a split. */}
        <div className="flex flex-col gap-4 lg:gap-3">
          <div className="rounded-lg border border-border/50 bg-bg-elevated/40 px-2 py-4 sm:px-4 sm:py-5">
            <p className="mb-3 px-1 text-xs tracking-wide text-steel uppercase">
              Tooth chart
            </p>
            <ToothChart2D />
          </div>

          {!webglFailed ? (
            <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-border/40 bg-transparent sm:min-h-[320px] lg:aspect-[5/4] lg:min-h-0">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    'radial-gradient(ellipse 55% 50% at 50% 48%, rgba(180,190,205,0.14) 0%, transparent 68%)',
                }}
              />
              <GrillCanvas
                onFallback={onFallback}
                mode="builder"
                className="h-full min-h-[280px] w-full sm:min-h-[320px]"
                showViewControls
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[52%]"
                style={{
                  background:
                    'linear-gradient(to bottom, #0a0a0b 0%, #0a0a0b 48%, rgba(10,10,11,0.75) 78%, transparent 100%)',
                }}
              />
            </div>
          ) : (
            <p className="rounded-md border border-border px-4 py-6 text-center text-sm text-steel">
              3D preview unavailable — use the tooth chart above.
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-6">
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
