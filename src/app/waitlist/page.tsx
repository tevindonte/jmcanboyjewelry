import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { WaitlistForm } from '@/components/WaitlistForm';
import { siteConfig } from '@/lib/site.config';

export const metadata = { title: 'Waitlist' };

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; design?: string }>;
}) {
  const sp = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-silver-bright">Join the waitlist</h1>
        <p className="mt-3 text-text-muted">
          First up when slots open. Refer friends. Each confirmed signup moves you up{' '}
          {siteConfig.referralBoostSpots} spots.
        </p>
        <div className="mt-8">
          <WaitlistForm referralCode={sp.ref} designId={sp.design} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
