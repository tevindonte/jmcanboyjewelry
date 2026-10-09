import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getSettings, getFoundingSlotsRemaining, resolvePublicTier } from '@/lib/settings';
import { calculateEstimate, formatCents, type TeethMap } from '@/lib/pricing';
import { normalizeMetalId, pricing, type ArchChoice } from '@/lib/pricing.config';
import { DesignReadonly } from '@/components/DesignReadonly';
import { getDoc, col } from '@/lib/db';

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
  const founding = await getFoundingSlotsRemaining();
  const tier = await resolvePublicTier();
  const estimate = calculateEstimate({
    arch: design.arch as ArchChoice,
    teeth,
    fulfillment: 'local_impression',
    tier,
    appliedSpot: settings.applied_spot,
    metal,
  });

  const goldQuote = metal === 'gold';
  const cta =
    goldQuote || settings.site_mode !== 'preorder'
      ? { href: `/build`, label: 'Build yours & join waitlist' }
      : {
          href: `/checkout?design=${design.$id}&email=${encodeURIComponent(String(design.email || ''))}`,
          label: 'Reserve this design',
        };

  const metalLabel = pricing.metals[metal].label;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
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
            'Price on request'
          )}
          {founding.remaining > 0 && !goldQuote && (
            <span className="ml-2 text-xs text-steel">
              ({founding.remaining} of {founding.total} founding left)
            </span>
          )}
        </p>
        {goldQuote && (
          <p className="mt-2 text-sm text-steel">
            Gold is quoted per order. Save your design and we&apos;ll send a price.
          </p>
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
