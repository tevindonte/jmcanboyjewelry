'use client';

import { useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';
import { pricing } from '@/lib/pricing.config';
import { formatCents, fulfillmentChargesKitFee, type FulfillmentChoice } from '@/lib/pricing';

export function CheckoutForm({
  designId,
  foundingAvailable,
  depositWithoutKitCents,
  prefillEmail,
  minimumHint,
}: {
  designId: string;
  foundingAvailable: boolean;
  /** Server-calculated deposit before kit fee (null if unpriced). */
  depositWithoutKitCents: number | null;
  prefillEmail?: string;
  /** Shown when under the minimum order after founding discount. */
  minimumHint?: string | null;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [fulfillment, setFulfillment] = useState<FulfillmentChoice>('kit_mail');
  const [terms, setTerms] = useState(false);
  const [mediaConsent, setMediaConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kitFeeCents =
    pricing.kitFee != null && fulfillmentChargesKitFee(fulfillment)
      ? Math.round(pricing.kitFee * 100)
      : 0;
  const depositCents =
    depositWithoutKitCents != null ? depositWithoutKitCents + kitFeeCents : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!terms) {
      setError('Accept the terms to continue.');
      return;
    }
    if (foundingAvailable && !mediaConsent) {
      setError('Founding price needs the filming/posting consent checkbox.');
      return;
    }
    if (!name.trim()) {
      setError('Enter your name so we can email your order link.');
      return;
    }
    if (!email.trim()) {
      setError('Enter the email for your receipt and order link.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId,
          name: name.trim(),
          email: email.trim(),
          phone: null,
          fulfillment,
          termsAccepted: true,
          mediaConsent: foundingAvailable ? mediaConsent : undefined,
          honeypot,
          shippingAddress: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');
      if (data.url) window.location.href = data.url;
      else throw new Error('Stripe did not return a checkout URL. Try again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {foundingAvailable && (
        <div className="rounded-md border border-border bg-bg-elevated p-3 text-sm text-text-muted">
          Founding client: {pricing.founding.discountPercent}% off. I&apos;m early in production,
          so expect a fit check. Founding prices are locked for the first{' '}
          {pricing.founding.slots} paying clients only.
        </div>
      )}

      {minimumHint && (
        <p className="rounded-md border border-border px-3 py-2 text-sm text-steel">{minimumHint}</p>
      )}

      <label className="block text-sm text-text-muted">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 outline-none focus:border-silver"
        />
      </label>
      <label className="block text-sm text-text-muted">
        Name
        <span className="text-xs text-steel"> (for your order emails)</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 outline-none focus:border-silver"
        />
      </label>

      <fieldset>
        <legend className="text-sm text-text-muted">How we get your fit</legend>
        <p className="mt-1 text-xs text-steel">
          Kit shipping address and mold/scan upload happen after you pay, on your order link.
        </p>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={fulfillment === 'kit_mail'}
              onChange={() => setFulfillment('kit_mail')}
            />
            Mail me an impression kit
            {pricing.kitFee != null && (
              <span className="text-xs text-steel">(+${pricing.kitFee} in deposit)</span>
            )}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={fulfillment === 'local_impression'}
              onChange={() => setFulfillment('local_impression')}
            />
            Local impression ({siteConfig.location})
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={fulfillment === 'dentist_scan'}
              onChange={() => setFulfillment('dentist_scan')}
            />
            I have a dentist 3D scan
            <span className="text-xs text-steel">(no kit fee)</span>
          </label>
        </div>
      </fieldset>

      {depositCents != null && (
        <p className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
          Deposit due today:{' '}
          <span className="font-medium text-silver-bright">{formatCents(depositCents)}</span>
          {kitFeeCents > 0 && pricing.kitFee != null && (
            <span className="text-text-muted">
              {' '}
              (includes ${pricing.kitFee} kit fee, credited to your total)
            </span>
          )}
          {fulfillment === 'dentist_scan' && (
            <span className="text-text-muted"> (kit fee waived for scan path)</span>
          )}
        </p>
      )}

      <label className="flex items-start gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-1"
          required
        />
        <span>
          I agree to the{' '}
          <Link href="/terms" className="text-silver underline">
            Terms
          </Link>{' '}
          (version {siteConfig.termsVersion}).
        </span>
      </label>

      {foundingAvailable && (
        <label className="flex items-start gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={mediaConsent}
            onChange={(e) => setMediaConsent(e.target.checked)}
            className="mt-1"
            required
          />
          <span>
            Founding discount: I agree you may film and post my impression, fit, and results
            (TikTok/IG/etc). I can revoke consent for future posts by emailing{' '}
            {siteConfig.contactEmail}. Past posts already up may stay.
          </span>
        </label>
      )}

      <input
        type="text"
        name="company"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-silver-bright px-4 py-3 text-sm font-semibold text-bg disabled:opacity-50"
      >
        {loading
          ? 'Redirecting to Stripe…'
          : depositCents != null
            ? `Pay deposit ${formatCents(depositCents)}`
            : 'Pay deposit'}
      </button>
    </form>
  );
}
