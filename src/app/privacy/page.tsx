import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { siteConfig } from '@/lib/site.config';

export const metadata = { title: 'Privacy' };

/**
 * DRAFT — needs review by someone qualified before launch.
 */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-xs text-steel-dim">
          Draft · needs qualified review before launch
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-silver-bright">Privacy</h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          {siteConfig.brandName} collects what we need to make and ship your grill, nothing extra
          for ads.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">What we collect</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
          <li>Name, email, phone (optional), and shipping address for kits</li>
          <li>Design JSON from the builder</li>
          <li>Payment status via Stripe (we never store card numbers)</li>
          <li>Mold photos you upload (private storage, admin-only signed links)</li>
          <li>
            Optional dentist 3D scans (.stl / .obj / .ply) used only to make your piece (private
            storage)
          </li>
          <li>Order events and messages needed to fulfill the job</li>
        </ul>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Mold photos</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Photos live in a private bucket. They are not public URLs. Admins view them through
          short-lived signed links only.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Dentist scans</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          If you upload a dentist 3D scan, it is stored in a private bucket (API key only, no
          public read). Used only to make your piece. You can delete it from your order link, or
          email us to request deletion. Admins download via short-lived signed links.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Deletion</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          You can request deletion of your data, mold photos, and scans. Email{' '}
          <a href={`mailto:${siteConfig.contactEmail}`} className="text-silver underline">
            {siteConfig.contactEmail}
          </a>
          . Use &quot;Delete my scan&quot; on your order link for scans. Admin can purge a scan or
          run a full delete from the order page. We may keep minimal records required for taxes or
          fraud prevention where the law requires it.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Email</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Waitlist and order emails include an unsubscribe link. We honor it.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Not medical</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          This is cosmetic jewelry. We do not provide dental or medical services or advice.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
