'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builder-store';
import { isQuoteOnlyMetal, pricing } from '@/lib/pricing.config';
import { siteConfig } from '@/lib/site.config';
import type { SiteMode } from '@/lib/site.config';

function selectedToothCount(teeth: Record<string, string>) {
  return Object.values(teeth).filter((s) => s && s !== 'none').length;
}

function shareUrl(id: string) {
  return `${window.location.origin}/d/${id}`;
}

export function SaveDesignPanel({ siteMode }: { siteMode: SiteMode }) {
  const router = useRouter();
  const arch = useBuilderStore((s) => s.arch);
  const metal = useBuilderStore((s) => s.metal);
  const teeth = useBuilderStore((s) => s.teeth);
  const customRequest = useBuilderStore((s) => s.customRequest);
  const customNotes = useBuilderStore((s) => s.customNotes);
  const customReferenceUrl = useBuilderStore((s) => s.customReferenceUrl);
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    designUrl: string;
    quoteOnly?: boolean;
  } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const quoteOnly = customRequest || isQuoteOnlyMetal(metal);
  const accepting = siteMode === 'preorder' || siteMode === 'waitlist';

  useEffect(() => {
    if (!error) return;
    if (/email/i.test(error)) emailRef.current?.focus();
    else errorRef.current?.focus();
  }, [error]);

  async function saveDesign() {
    const res = await fetch('/api/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        arch,
        teeth,
        metal,
        customRequest,
        customNotes,
        customReferenceUrl,
        honeypot,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? data.detail ?? 'Could not save design');
    return data as { id: string; url: string; metal: string; quoteOnly?: boolean };
  }

  async function onPrimary() {
    setLoading(true);
    setError(null);
    try {
      if (!customRequest && selectedToothCount(teeth) === 0) {
        throw new Error('Pick at least one tooth to continue.');
      }
      if (customRequest && customNotes.trim().length < 8) {
        throw new Error('Describe what you want (at least a short sentence).');
      }
      if (!email.trim()) {
        throw new Error('Enter your email to continue.');
      }

      const design = await saveDesign();
      const designUrl = shareUrl(design.id);
      const needsQuote = quoteOnly || design.quoteOnly || siteMode === 'closed' || !accepting;

      if (needsQuote) {
        setDone({ designUrl, quoteOnly: true });
        return;
      }

      router.push(
        `/checkout?design=${encodeURIComponent(design.id)}&email=${encodeURIComponent(email)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const primaryLabel = quoteOnly
    ? 'Save & request quote'
    : siteMode === 'closed'
      ? 'Save design'
      : 'Continue to deposit';

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-elevated p-4">
      <h2 className="font-display text-lg text-silver-bright">
        {quoteOnly ? 'Request a quote' : 'Checkout'}
      </h2>

      {!done ? (
        <>
          <p className="text-sm text-text-muted">
            {customRequest
              ? 'Email once. We save your custom notes and email a quote.'
              : quoteOnly
                ? `Email once. We save your ${pricing.metals[metal].shortLabel.toLowerCase()} design and email a quote.`
                : 'Email once. Next screen is checkout for the deposit.'}
          </p>
          {error && (
            <p
              ref={errorRef}
              id="save-design-error"
              role="alert"
              tabIndex={-1}
              className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger outline-none"
            >
              {error}
            </p>
          )}
          <label className="block text-sm text-text-muted">
            Email
            <input
              ref={emailRef}
              type="email"
              required
              value={email}
              aria-invalid={Boolean(error && /email/i.test(error))}
              aria-describedby={error ? 'save-design-error' : undefined}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-silver"
              autoComplete="email"
            />
          </label>
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
          <button
            type="button"
            disabled={loading || !email}
            aria-busy={loading}
            onClick={onPrimary}
            className="min-h-11 w-full rounded-md bg-silver-bright px-4 py-3 text-sm font-semibold text-bg hover:bg-silver disabled:opacity-50"
          >
            {loading ? 'Working…' : primaryLabel}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-ok">
            {done.quoteOnly
              ? 'Design saved. We will email a quote.'
              : 'Design saved.'}
          </p>
          <p className="text-sm text-text-muted">
            Questions?{' '}
            <a
              href={`mailto:${siteConfig.contactEmail}?subject=Quote%20request&body=Design:%20${encodeURIComponent(done.designUrl)}`}
              className="text-silver underline"
            >
              {siteConfig.contactEmail}
            </a>
          </p>
          <p className="text-sm text-text-muted">Share your design:</p>
          <a href={done.designUrl} className="block break-all text-sm text-silver underline">
            {done.designUrl}
          </a>
        </>
      )}
    </div>
  );
}
