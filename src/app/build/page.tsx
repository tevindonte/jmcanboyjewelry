import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BuilderShell } from '@/components/builder/BuilderShell';
import { getFoundingSlotsRemaining, getSettings } from '@/lib/settings';

export const metadata = { title: 'Build' };

export default async function BuildPage() {
  const settings = await getSettings();
  const founding = await getFoundingSlotsRemaining();

  return (
    <>
      <SiteHeader />
      <main>
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
