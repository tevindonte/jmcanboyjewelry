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
  'Packaging to send your impression back',
];

const STEPS = [
  'Wash hands. Read the card once before you start. Putty sets on a timer.',
  'Mix/load trays exactly as shown in the video.',
  'Bite centered, hold still for the full set time. Do not talk or chew.',
  'Remove straight down/up. Check that teeth details show clean.',
  'Photograph from 3 angles, then pack and ship back within a day or two.',
];

export default function KitPage() {
  const kitFeeLabel =
    pricing.kitFee != null ? formatUsd(pricing.kitFee) : `$${35}`;

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-16 outline-none">
        <h1 className="font-display text-3xl font-bold text-silver-bright">Impression kit</h1>
        <p className="mt-3 text-text-muted">
          Mail kit for customers outside {siteConfig.location}. Local clients can skip this and get
          an in-person impression instead. A dentist 3D scan also skips the kit.
        </p>
        <p className="mt-2 text-sm text-steel">
          Kit fee: {kitFeeLabel}, charged on top of the grill price (not credited). Included in
          your deposit when we mail a kit. Dentist scan or local impression: no kit fee.
        </p>

        <h2 className="mt-12 font-display text-xl text-silver-bright">What&apos;s in the kit</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-text-muted">
          {CONTENTS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <h2 className="mt-12 font-display text-xl text-silver-bright">Prepaid return label</h2>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          The kit and the prepaid return label can arrive separately. We email the label as a PDF,
          or as a QR code the Post Office can print if you have no printer. Put the impression in
          the kit&apos;s box or a padded envelope, stick on the label, and drop it off at USPS —
          you don&apos;t pay to ship it back. Mail it back within a day or two of taking the
          impression.
        </p>

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
          <Link href="/build" className="text-silver underline">
            order link
          </Link>{' '}
          (emailed after your deposit).
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
