import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getSettings, resolvePublicTier } from '@/lib/settings';
import { calculateEstimate, formatCents, type TeethMap } from '@/lib/pricing';
import {
  normalizeMetalId,
  isQuoteOnlyMetal,
  pricing,
  type ArchChoice,
} from '@/lib/pricing.config';
import { DesignReadonly } from '@/components/DesignReadonly';
import { getDoc, col } from '@/lib/db';
import { parseCustomJson } from '@/lib/custom-request';

export const metadata = { title: 'Design' };

export default async function DesignSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const design = await getDoc(col.designs, id);
  if (!design) notFound();

  const teeth = JSON.parse(String(design.teeth_json ?? '{}')) as TeethMap;
  const metal = normalizeMetalId(design.metal);
  const settings = await getSettings();
  const tier = await resolvePublicTier();
  const estimate = calculateEstimate({
    arch: design.arch as ArchChoice,
    teeth,
    fulfillment: 'local_impression',
    tier,
    appliedSpot: settings.applied_spot,
    metal,
  });

  const custom = parseCustomJson(design.custom_json);
  const quoteOnly = Boolean(custom?.enabled) || isQuoteOnlyMetal(metal);
  const cta = quoteOnly
    ? { href: `/build`, label: 'Build yours & request a quote' }
    : settings.site_mode === 'closed'
      ? { href: `/build`, label: 'Build yours' }
      : {
          href: `/checkout?design=${design.$id}&email=${encodeURIComponent(String(design.email || ''))}`,
          label: 'Continue to deposit',
        };

  const metalLabel = pricing.metals[metal].label;

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-12 outline-none">
        <h1 className="font-display text-3xl font-bold text-silver-bright">Saved design</h1>
        <p className="mt-2 text-text-muted">
          Read-only preview · {metalLabel}. Estimate:{' '}
          {estimate.quoteOnly ? (
            <span className="text-silver-bright">Quoted per order</span>
          ) : estimate.priced &&
            tier === 'founding' &&
            estimate.regularToothSubtotalCents != null ? (
            <>
              <span className="mr-2 text-steel line-through">
                {formatCents(estimate.regularToothSubtotalCents)}
              </span>
              <span className="text-silver-bright">{formatCents(estimate.totalCents)}</span>
            </>
          ) : estimate.priced ? (
            formatCents(estimate.totalCents)
          ) : (
            'Quoted per order'
          )}
        </p>
        {quoteOnly && (
          <p className="mt-2 text-sm text-steel">
            {custom?.enabled
              ? 'Custom request — quoted per order.'
              : metal === 'plating'
                ? 'Gold plating is upon request — save your design and we will email a price. Stones upon request.'
                : `${pricing.metals[metal].shortLabel} is quoted per order — not dental gold, not permanent. Plating and stones upon request.`}{' '}
            Save from the builder and we will email a price.
          </p>
        )}
        {custom?.enabled && custom.notes && (
          <div className="mt-4 rounded-md border border-border bg-bg-elevated p-4 text-sm">
            <p className="text-xs tracking-wide text-steel uppercase">Custom notes</p>
            <p className="mt-2 whitespace-pre-wrap text-text-muted">{custom.notes}</p>
            {custom.referenceUrl && (
              <a
                href={custom.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block break-all text-silver underline"
              >
                {custom.referenceUrl}
                <span className="sr-only"> (opens in a new window)</span>
              </a>
            )}
          </div>
        )}
        <DesignReadonly arch={design.arch as ArchChoice} teeth={teeth} />
        <p className="mt-4 text-xs text-steel">
          This is a style preview, not your actual teeth. Fit comes from your mold.
        </p>
        <Link
          href={cta.href}
          className="mt-8 inline-block rounded-md bg-silver-bright px-6 py-3 text-sm font-semibold text-bg"
        >
          {cta.label}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
