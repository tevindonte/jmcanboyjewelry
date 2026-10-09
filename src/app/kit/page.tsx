import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { siteConfig } from '@/lib/site.config';
import { pricing } from '@/lib/pricing.config';
import { formatUsd } from '@/lib/pricing';
import Link from 'next/link';

export const metadata = { title: 'Impression kit' };

const CONTENTS = [
  'Impression trays (sizes noted in kit)',
  'Putty / material for one full set',
  'Step card + link to the video below',
  'Return mailer instructions',
];

const STEPS = [
  'Wash hands. Read the card once before you start. Putty sets on a timer.',
  'Mix/load trays exactly as shown in the video.',
  'Bite centered, hold still for the full set time. Do not talk or chew.',
  'Remove straight down/up. Check that teeth details show clean.',
  'Photograph from 3 angles, then pack and ship back.',
];

export default function KitPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-silver-bright">Impression kit</h1>
        <p className="mt-3 text-text-muted">
          Mail kit for customers outside New Rochelle. Local clients can skip this and get an
          in-person impression instead.
        </p>
        <p className="mt-2 text-sm text-steel">
          Kit fee:{' '}
          {pricing.kitFee != null ? formatUsd(pricing.kitFee) : 'Price on request'}
          {pricing.kitCreditedToBalance
            ? '. Charged in your deposit, credited so your total stays the grill price. Non-refundable once the kit ships.'
            : ''}{' '}
          Local pickups: no kit fee.
        </p>

        <h2 className="mt-12 font-display text-xl text-silver-bright">What&apos;s in the kit</h2>
        {/* TODO(owner): confirm exact kit contents */}
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-text-muted">
          {CONTENTS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <h2 className="mt-12 font-display text-xl text-silver-bright">How to take an impression</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-text-muted">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>

        {siteConfig.impressionVideoUrl ? (
          <div className="mt-8 aspect-video overflow-hidden rounded-lg border border-border">
            <iframe
              src={siteConfig.impressionVideoUrl}
              title="Impression tutorial"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="mt-6 rounded-md border border-border bg-bg-elevated p-4 text-sm text-steel">
            Tutorial video URL pending. {/* TODO(owner) */}
          </p>
        )}

        <p className="mt-10 text-sm text-text-muted">
          After your deposit is paid, upload mold photos from your{' '}
          <Link href="/waitlist" className="text-silver underline">
            order link
          </Link>{' '}
          (emailed to you).
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
