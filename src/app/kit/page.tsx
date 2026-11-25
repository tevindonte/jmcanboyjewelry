import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { siteConfig } from '@/lib/site.config';
import { pricing } from '@/lib/pricing.config';
import { formatUsd } from '@/lib/pricing';
import Link from 'next/link';

export const metadata = { title: 'Impression kit' };

const CONTENTS = [
  'Upper and lower impression trays (Large by default, Medium available on request)',
  'Two-part putty, one set for each arch (white and blue)',
  'A link to our how-to video and a step card',
  "A prepaid return label, emailed to you (PDF, or a QR code the Post Office prints if you don't have a printer). Your kit and your label can arrive separately.",
];

const STEPS = [
  "Wash and dry your hands. Read all the steps once before you open anything. Do one arch at a time, upper first, so the putty doesn't set before you use it.",
  "Open one pair of tubs. Knead the white and blue putty together with your fingers until it's one even color with no streaks. This takes about 30 seconds. Work quickly, it starts to set.",
  'Roll it into a rope shape and press it evenly into the tray, edge to edge, so the whole tray is filled.',
  "Center the tray over your teeth and press gently until the putty comes up around your teeth and the base of your gums. Don't bite down hard and don't chew. Hold still.",
  "Wait about 2 to 3 minutes. A warm room sets faster. Don't talk or move the tray.",
  'Remove it in one smooth motion: pull down for the upper, up for the lower.',
  "Check it. Every tooth should show clear detail, with no gaps, bubbles, or bare spots where the tray touched. If it doesn't, don't mail it. Message us first.",
  'Repeat for the other arch with the second pair of tubs.',
  'Rinse gently under cool water and pat dry. Photograph each impression from 3 angles.',
  "Put the impressions in the kit's box or a padded envelope, stick on the return label, and drop it off at USPS within a day or two.",
];

export default function KitPage() {
  const kitFeeLabel =
    pricing.kitFee != null ? formatUsd(pricing.kitFee) : `$${35}`;

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-16 outline-none">
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
        <p className="mt-3 text-sm text-text-muted">
          If anything in the box is different from this page, follow the steps on this page.
        </p>

        <h2 className="mt-12 font-display text-xl text-silver-bright">
          How to take your impression
        </h2>
        <figure className="mt-6 overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/impression-process.jpg"
            alt="JMCANBOY Jewelry impression process: eight steps from preparing putty and trays through mixing, loading the tray, taking upper and lower impressions, and checking the final results."
            className="h-auto w-full"
            width={1920}
            height={1080}
          />
          <figcaption className="border-t border-border px-3 py-2 text-xs text-steel">
            Visual guide — follow the numbered steps on this page for set times and return
            shipping.
          </figcaption>
        </figure>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-text-muted">
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
