import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CheckoutForm } from '@/components/CheckoutForm';
import { getFoundingSlotsRemaining, getSettings, resolvePublicTier } from '@/lib/settings';
import { getDoc, col } from '@/lib/db';
import {
  calculateEstimate,
  formatCents,
  teethToPassMinimum,
  type TeethMap,
} from '@/lib/pricing';
import { normalizeMetalId, pricing, type ArchChoice } from '@/lib/pricing.config';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Checkout' };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSettings();
  const founding = await getFoundingSlotsRemaining();

  if (settings.site_mode !== 'preorder') {
    redirect(
      sp.design
        ? `/build?notice=waitlist&design=${encodeURIComponent(sp.design)}`
        : '/build?notice=waitlist',
    );
  }

  if (!sp.design) {
    redirect('/build?notice=pick-design');
  }

  const design = await getDoc(col.designs, sp.design);
  if (!design) {
    redirect('/build?notice=missing-design');
  }

  const tier = await resolvePublicTier();
  const teeth = JSON.parse(String(design.teeth_json ?? '{}')) as TeethMap;
  const metal = normalizeMetalId(design.metal);
  const estimate = calculateEstimate({
    arch: design.arch as ArchChoice,
    teeth,
    fulfillment: 'dentist_scan',
    tier,
    appliedSpot: settings.applied_spot,
    metal,
  });

  if (estimate.selectedToothCount === 0) {
    redirect('/build?notice=pick-teeth');
  }

  if (metal === 'gold') {
    redirect(`/waitlist?design=${encodeURIComponent(sp.design)}`);
  }

  const moreTeeth = teethToPassMinimum(estimate);
  const minimumHint =
    estimate.minimumApplied && moreTeeth > 0
      ? `Minimum order is ${formatCents((pricing.minimumOrder ?? 0) * 100)}. Add about ${moreTeeth} more plain tooth${moreTeeth === 1 ? '' : ' teeth'} (or go back to the builder) to clear the minimum.`
      : null;

  const depositWithoutKitCents = estimate.depositCents;
  const prefillEmail =
    typeof sp.email === 'string' && sp.email.includes('@')
      ? sp.email
      : String(design.email || '');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-silver-bright">Reserve your slot</h1>
        <p className="mt-3 text-text-muted">
          Pay the deposit here. Mold kit address, photos, or dentist scan come after on your order
          link.
        </p>
        <p className="mt-2 text-sm text-steel">
          <Link href="/build" className="underline hover:text-silver">
            ← Back to builder
          </Link>
        </p>
        <div className="mt-8">
          <CheckoutForm
            designId={sp.design}
            foundingAvailable={founding.remaining > 0 && tier === 'founding'}
            depositWithoutKitCents={depositWithoutKitCents}
            prefillEmail={prefillEmail}
            minimumHint={minimumHint}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
