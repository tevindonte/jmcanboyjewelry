import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { siteConfig } from '@/lib/site.config';

export const metadata = { title: 'Terms' };

/**
 * DRAFT — needs review by someone qualified before launch.
 * Not legal advice. Flag for attorney / qualified review.
 */
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 prose-invert">
        <p className="text-xs text-steel-dim">
          Draft · version {siteConfig.termsVersion} · needs qualified review before launch
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-silver-bright">Terms</h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          These terms cover custom sterling silver grillz from {siteConfig.brandName} (
          {siteConfig.domain}). This is cosmetic jewelry — not a dental or medical product.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Deposit &amp; kit fee</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          The deposit is non-refundable once design work starts <em>or</em> once the impression kit
          has shipped — whichever comes first. Before that point, contact us and we&apos;ll work
          with you.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Mailed kits add a $30 kit fee inside your deposit. It&apos;s credited so your total still
          equals the grill price (you don&apos;t pay kit on top). That kit fee is non-refundable
          once the kit ships. Local impressions in {siteConfig.location} pay no kit fee.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-steel">
          {/* TODO(owner): exact refund rule if the mold is unusable */}
          If your mold comes back unusable: refund / remake policy is TODO(owner) — ask before
          launch.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Founding clients</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          I&apos;m early in production. Expect a fit check and possible small adjustments. If it
          doesn&apos;t fit, I&apos;ll adjust or remake it. The founding discount is conditional on
          agreeing that I may film and post your impression, fit, and results. To revoke consent
          for <em>future</em> posts, email {siteConfig.contactEmail} — posts already up may stay.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-steel">
          {/* TODO(owner): exact remake policy */}
          Exact remake policy (how many remakes, who pays shipping, timelines) is TODO(owner).
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Turnaround</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Any timeline I give is an estimate, not a guarantee. Custom metalwork has variables —
          molds, casting, polishing. I&apos;ll keep you posted on your order page.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Fit and the preview</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          The 3D builder is a style preview, not a scan of your mouth. Fit comes from your mold. If
          you rush the impression, the piece will show it.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Care</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Sterling silver tarnishes. Not for eating or sleeping in. See the{' '}
          <a href="/care" className="text-silver underline">
            care card
          </a>
          .
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Contact</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {siteConfig.contactEmail} · {siteConfig.location}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
