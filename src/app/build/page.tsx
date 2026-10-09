import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BuilderShell } from '@/components/builder/BuilderShell';
import { getFoundingSlotsRemaining, getSettings } from '@/lib/settings';

export const metadata = { title: 'Build' };

const NOTICES: Record<string, string> = {
  waitlist:
    'Checkout is closed right now. Join the waitlist below — we will email you when deposits open.',
  'pick-design': 'Start here: pick your teeth, then reserve or join with your email.',
  'missing-design': 'That design link was not found. Build again and save from this site.',
  'pick-teeth': 'Pick at least one tooth to continue.',
};

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSettings();
  const founding = await getFoundingSlotsRemaining();
  const notice = sp.notice ? NOTICES[sp.notice] : null;

  return (
    <>
      <SiteHeader />
      <main>
        {notice && (
          <p className="mx-auto max-w-6xl px-4 pt-6 text-sm text-steel">{notice}</p>
        )}
        <BuilderShell
          siteMode={settings.site_mode}
          foundingRemaining={founding.remaining}
          foundingTotal={founding.total}
          appliedSpot={settings.applied_spot}
        />
      </main>
      <SiteFooter />
    </>
  );
}
