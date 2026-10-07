import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSettings, getFoundingSlotsRemaining, resolvePublicTier } from '@/lib/settings';
import { calculateEstimate, formatCents, type TeethMap } from '@/lib/pricing';
import type { ArchChoice } from '@/lib/pricing.config';
import { DesignReadonly } from '@/components/DesignReadonly';

export const metadata = { title: 'Design' };

export default async function DesignSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: design } = await supabase.from('designs').select('*').eq('id', id).single();
  if (!design) notFound();

  const settings = await getSettings();
  const founding = await getFoundingSlotsRemaining();
  const tier = await resolvePublicTier();
  const estimate = calculateEstimate({
    arch: design.arch as ArchChoice,
    teeth: design.teeth as TeethMap,
    fulfillment: 'local_impression',
    tier,
    appliedSpot: settings.applied_spot,
  });

  const cta =
    settings.site_mode === 'preorder'
      ? { href: `/checkout?design=${design.id}`, label: 'Reserve this design' }
      : { href: `/waitlist?design=${design.id}`, label: 'Join waitlist' };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-silver-bright">Saved design</h1>
        <p className="mt-2 text-text-muted">
          Read-only preview. Estimate:{' '}
          {estimate.priced &&
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
          {founding.remaining > 0 && (
            <span className="ml-2 text-xs text-steel">
              ({founding.remaining} of {founding.total} founding left)
            </span>
          )}
        </p>
        <DesignReadonly arch={design.arch as ArchChoice} teeth={design.teeth as TeethMap} />
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
