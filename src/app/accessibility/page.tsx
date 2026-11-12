import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { siteConfig } from '@/lib/site.config';
import Link from 'next/link';

export const metadata = { title: 'Accessibility' };

export default function AccessibilityPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-16 outline-none">
        <h1 className="font-display text-3xl font-bold text-silver-bright">
          Accessibility statement
        </h1>
        <p className="mt-4 text-text-muted">
          {siteConfig.brandName} is committed to making jmcanboyjewelry.com usable by as many
          people as possible, including people with disabilities. We aim to conform to the Web
          Content Accessibility Guidelines (WCAG) 2.2 Level AA.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Measures we take</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
          <li>Semantic HTML landmarks, headings, and labeled form controls</li>
          <li>Keyboard-operable navigation, tooth chart, and builder controls</li>
          <li>Visible focus styles and a skip link to main content</li>
          <li>Color contrast tuned for body and UI text on our dark theme</li>
          <li>Respect for prefers-reduced-motion on decorative and 3D auto-rotation</li>
          <li>
            Live text summary of the 3D style preview (arch, metal, selected teeth, estimate)
          </li>
          <li>Form errors announced and focus moved to the problem field or error summary</li>
          <li>FAQ controls expose expanded/collapsed state to assistive technology</li>
          <li>
            Deposit pricing updates announced when fulfillment choices change; card payment
            completes on Stripe&apos;s hosted Checkout
          </li>
        </ul>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Known limitations</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
          <li>
            The 3D grill preview is a visual style tool. A 2D tooth chart with buttons is
            available as the primary way to select teeth and styles without relying on the
            canvas alone.
          </li>
          <li>
            Third-party checkout (Stripe) and any embedded social or video players are
            controlled by those providers; we choose accessible options when we can.
          </li>
          <li>
            Impression tutorial video (when published) should include captions; contact us if
            a transcript is needed before captions are available.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Feedback</h2>
        <p className="mt-3 text-sm text-text-muted">
          If you find a barrier on this site, email{' '}
          <a href={`mailto:${siteConfig.contactEmail}`} className="text-silver underline">
            {siteConfig.contactEmail}
          </a>{' '}
          or call{' '}
          <a href={`tel:+1${siteConfig.contactPhone}`} className="text-silver underline">
            {siteConfig.contactPhoneDisplay}
          </a>
          . Please include the page URL and what you were trying to do. We aim to respond
          within two business days.
        </p>

        <h2 className="mt-10 font-display text-xl text-silver-bright">Compatibility</h2>
        <p className="mt-3 text-sm text-text-muted">
          This site is designed to work with current major browsers and common assistive
          technologies (for example VoiceOver, NVDA, and JAWS with a recent browser). We
          continue to test and improve.
        </p>

        <p className="mt-10 text-xs text-steel">
          This statement was last updated November 11, 2026. Related:{' '}
          <Link href="/privacy" className="text-silver underline">
            Privacy
          </Link>
          {' · '}
          <Link href="/terms" className="text-silver underline">
            Terms
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
