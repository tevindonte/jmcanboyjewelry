import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { HeroGrill } from '@/components/HeroGrill';
import { FaqAccordion } from '@/components/FaqAccordion';
import { siteConfig } from '@/lib/site.config';
import { pricing } from '@/lib/pricing.config';

const STEPS = [
  { title: 'Impression', body: 'Mail kit or in-person in Westchester.' },
  { title: 'Scan', body: 'Your mold becomes the fit source of truth.' },
  { title: 'Print', body: 'Resin model of your design on your arch.' },
  { title: 'Cast', body: 'Sterling silver ready to order; other metals quoted.' },
  { title: 'Polish', body: 'Brushed or polished finish, cleaned up.' },
  { title: 'Ship', body: 'Out the door with a care card.' },
];

const FAQ = [
  {
    q: 'Is this dental work?',
    a: 'No. These are removable cosmetic jewelry pieces. Not a medical or dental product. We do not make dental gold or permanent dental work.',
  },
  {
    q: 'What metals do you offer?',
    a: 'Sterling silver is ready to order online. Gold and platinum are quoted per order (email after you save a design). Gold plating and stones (diamond, CZ, moissanite, etc.) are upon request.',
  },
  {
    q: 'How does the deposit work?',
    a: `For silver (priced online), you pay a ${pricing.depositPercent}% deposit on the grill plus the $${pricing.kitFee} kit fee in that deposit if we mail a kit (kit is charged on top of the grill, not credited). Rest of the grill is due when the piece is ready. Minimum order $${pricing.minimumOrder}. Quote metals are emailed separately. See Terms for when the deposit / kit fee become non-refundable.`,
  },
  {
    q: 'Do I need a dentist?',
    a: 'No. You take a home impression with the kit, or come in locally for an impression. Fit comes from that mold, not the 3D preview.',
  },
  {
    q: 'Can I eat or sleep in them?',
    a: 'No. Sterling tarnishes and grillz are not for eating or sleeping in. Wipe with a polishing cloth.',
  },
  {
    q: 'How long does it take?',
    a: 'Turnaround is an estimate, not a guarantee. Production is still getting dialed in.',
  },
];

export default async function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {/* Hero — brand + copy left (desktop), model right / below */}
        <section className="relative overflow-x-clip bg-gradient-to-br from-bg via-bg-soft to-bg lg:min-h-[100dvh]">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              // Soft wash behind the right-column arch center
              background:
                'radial-gradient(ellipse 55% 45% at 75% 50%, rgba(192,198,210,0.14), transparent 62%)',
            }}
          />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-4 px-4 pb-10 pt-24 sm:gap-6 lg:min-h-[100dvh] lg:grid-cols-2 lg:gap-12 lg:pb-16 lg:pt-24">
            <div className="order-1 z-10 flex flex-col justify-center lg:order-1">
              <p className="font-display text-xs font-semibold tracking-[0.22em] text-silver uppercase">
                {siteConfig.brandName}
              </p>
              <h1 className="mt-3 max-w-xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-silver-bright sm:text-6xl">
                Custom grillz
              </h1>
              <p className="mt-2 text-sm font-medium tracking-wide text-silver">
                Sterling silver ready to order. Gold and platinum by quote.
              </p>
              <p className="mt-4 max-w-md text-base text-text-muted sm:text-lg">
                Pick your teeth. Pay a deposit on silver. Send your mold. Removable jewelry
                only — plating and stones upon request.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/build"
                  className="rounded-md bg-silver-bright px-6 py-3 text-sm font-semibold text-bg hover:bg-silver"
                >
                  Open builder
                </Link>
              </div>
            </div>
            <div className="order-2 relative isolate flex h-[min(88vw,520px)] min-h-[360px] w-full min-w-0 items-center justify-center self-center bg-transparent pb-4 lg:h-[min(68vh,620px)] lg:max-h-[calc(100dvh-8rem)] lg:pb-0">
              <HeroGrill />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-3xl font-bold text-silver-bright">How it works</h2>
          <p className="mt-2 max-w-lg text-text-muted">
            From mold to metal. No shortcuts on fit.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <p className="font-display text-xs tracking-widest text-steel-dim">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-display text-xl text-silver-bright">{step.title}</h3>
                <p className="mt-1 text-sm text-text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {siteConfig.tiktokClips.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="font-display text-3xl font-bold text-silver-bright">From TikTok</h2>
            <p className="mt-2 text-text-muted">Recent clips. {/* TODO(owner): supply URLs */}</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {siteConfig.tiktokClips.map((url) => (
                <li key={url} className="overflow-hidden rounded-lg border border-border">
                  <blockquote className="p-4 text-sm text-text-muted">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-silver">
                      {url}
                    </a>
                  </blockquote>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-3xl font-bold text-silver-bright">
            FAQ
          </h2>
          <FaqAccordion items={FAQ} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
