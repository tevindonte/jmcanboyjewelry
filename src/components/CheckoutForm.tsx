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
}: {
  designId: string;
  foundingAvailable: boolean;
  /** Server-calculated deposit before kit fee (null if unpriced). */
  depositWithoutKitCents: number | null;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fulfillment, setFulfillment] = useState<FulfillmentChoice>('kit_mail');
  const [terms, setTerms] = useState(false);
  const [mediaConsent, setMediaConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postal, setPostal] = useState('');
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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId,
          name,
          email,
          phone: phone || null,
          fulfillment,
          termsAccepted: true,
          mediaConsent: foundingAvailable ? mediaConsent : undefined,
          honeypot,
          shippingAddress:
            fulfillment === 'kit_mail'
              ? { line1, city, state, postal_code: postal, country: 'US' }
              : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');
      if (data.url) window.location.href = data.url;
      else throw new Error('No checkout URL');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {foundingAvailable && (
        <div className="rounded-md border border-border bg-bg-elevated p-3 text-sm text-text-muted">
          Founding client: {pricing.founding.discountPercent}% off. I&apos;m early in production —
          expect a fit check. Founding prices are locked for the first{' '}
          {pricing.founding.slots} paying clients only.
        </div>
      )}

      <label className="block text-sm text-text-muted">
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 outline-none focus:border-silver"
        />
      </label>
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
        Phone
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 outline-none focus:border-silver"
        />
      </label>

      <fieldset>
        <legend className="text-sm text-text-muted">Fulfillment</legend>
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
            <span className="text-text-muted"> — kit fee waived for scan path</span>
          )}
        </p>
      )}

      {fulfillment === 'kit_mail' && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-xs text-steel">Shipping address for the kit</p>
          <input
            required
            placeholder="Address"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-silver"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-silver"
            />
            <input
              required
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-silver"
            />
          </div>
          <input
            required
            placeholder="ZIP"
            value={postal}
            onChange={(e) => setPostal(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-silver"
          />
        </div>
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
