import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { siteConfig } from '@/lib/site.config';

export const metadata = { title: 'Care' };

/**
 * DRAFT care card — review before launch.
 */
export default function CarePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-xs tracking-[0.2em] text-steel uppercase">{siteConfig.brandName}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-silver-bright">Care card</h1>
        <p className="mt-4 text-text-muted">Sterling silver grillz. Treat them like jewelry.</p>

        <ul className="mt-10 space-y-6 text-sm leading-relaxed text-text-muted">
          <li>
            <strong className="text-silver-bright">Tarnish is normal.</strong> Sterling reacts to
            air, sweat, and sulfur. A soft polishing cloth brings the shine back.
          </li>
          <li>
            <strong className="text-silver-bright">Not for eating.</strong> Take them out before
            meals. Food + metal is a bad combo for the piece and for you.
          </li>
          <li>
            <strong className="text-silver-bright">Not for sleeping.</strong> Remove them at night.
            Pressure and grinding will wreck the fit and the finish.
          </li>
          <li>
            <strong className="text-silver-bright">Clean gentle.</strong> Soft cloth. No bleach, no
            toothpaste grind, no ultrasonic unless we say otherwise.
          </li>
          <li>
            <strong className="text-silver-bright">Store dry.</strong> Soft pouch or cloth, away
            from humidity when you&apos;re not wearing them.
          </li>
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
