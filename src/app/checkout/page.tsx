import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CheckoutForm } from '@/components/CheckoutForm';
import { getFoundingSlotsRemaining, getSettings } from '@/lib/settings';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Checkout' };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSettings();
  const founding = await getFoundingSlotsRemaining();

  if (settings.site_mode !== 'preorder') {
    redirect(sp.design ? `/waitlist?design=${sp.design}` : '/waitlist');
  }

  if (!sp.design) {
    redirect('/build');
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-silver-bright">Reserve your slot</h1>
        <p className="mt-3 text-text-muted">
          Deposit via Stripe (card, Cash App Pay, Apple Pay, Google Pay). Price is calculated on
          the server from your saved design — and frozen on the order.
        </p>
        <div className="mt-8">
          <CheckoutForm
            designId={sp.design}
            foundingAvailable={founding.remaining > 0}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
