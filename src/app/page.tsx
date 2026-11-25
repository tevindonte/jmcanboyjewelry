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
    q: 'What do you make?',
    a: `Custom removable grillz in sterling silver (.925), made from your mold so they fit your teeth. Sold by the tooth — top, bottom, or both. Common sets: top 6, top 8, 6 on 6, 8 on 8. Gold and platinum are by quote. Hand-finished and polished. Not dental work, not permanent / fixed grills.`,
  },
  {
    q: 'What styles and silver prices?',
    a: `Plain (full cap) $${pricing.perTooth.plain}/tooth. Window (open face with a rim) $${pricing.perTooth.window}/tooth. Deep cut (horizontal grooves) $${pricing.perTooth.deepcut}/tooth. Mix styles on one set — priced by tooth. Minimum order $${pricing.minimumOrder}. Other custom looks: save a custom request and we email a quote.`,
  },
  {
    q: 'What about gold, platinum, plating, or stones?',
    a: 'Sterling silver is ready to order online. Gold and platinum are quoted per order (price depends on metal weight — we email a quote after you save a design; metal cost is handled in that quote). Gold plating and stones (diamond, CZ, moissanite, etc.) are upon request — ask and we follow up; no online price for those.',
  },
  {
    q: 'How does ordering work?',
    a: `Build your set online, pay the silver deposit at checkout, then send your mold. We mail an impression kit with return instructions (or you skip the kit with a dentist 3D scan, or come in locally in ${siteConfig.location}). We cast and finish from that mold. Remaining grill balance is due before it ships.`,
  },
  {
    q: 'How does the deposit and kit fee work?',
    a: `Silver: ${pricing.depositPercent}% of the grill, plus $${pricing.kitFee} in that deposit if we mail a kit (kit is on top of the grill, not credited). Example — top 6 plain ($${6 * (pricing.perTooth.plain ?? 50)}) with a kit: deposit $${150 + (pricing.kitFee ?? 35)} ($${150} + $${pricing.kitFee}), balance $150. Local impression or dentist scan: no kit fee. Gold/platinum payment terms come with the quote. See Terms for when the deposit / kit fee become non-refundable.`,
  },
  {
    q: 'Do I need a dentist?',
    a: 'No. Most people use the mail kit (how-to video included) or an in-person impression locally. A dentist scan (STL, OBJ, or PLY) also works and skips the kit. Fit comes from the mold or scan, not the 3D preview on the site.',
  },
  {
    q: 'How long does it take?',
    a: 'About 2 to 3 weeks from when the kit ships, depending on shipping both ways. That is an estimate, not a guarantee — no rush or event-date promises. If you have a date, tell us and we will say honestly whether it is realistic.',
  },
  {
    q: 'Can I eat or sleep in them?',
    a: 'No. Take them out to eat and sleep. Clean with warm soapy water and a soft toothbrush; shine with a silver polishing cloth. Sterling can tarnish over time. More on the care page.',
  },
  {
    q: 'What if it does not fit?',
    a: `Email ${siteConfig.contactEmail}. Fit comes from your impression — if something is off, we will take care of it. Do not guess remake or refund rules from chat; ask us on your order.`,
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
