'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/store/builder-store';
import type { SiteMode } from '@/lib/site.config';

export function SaveDesignPanel({
  siteMode,
  tier,
}: {
  siteMode: SiteMode;
  tier: 'founding' | 'friend' | 'standard';
}) {
  const arch = useBuilderStore((s) => s.arch);
  const metal = useBuilderStore((s) => s.metal);
  const teeth = useBuilderStore((s) => s.teeth);
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; url: string; metal: string } | null>(
    null,
  );

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, arch, teeth, metal, honeypot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save');
      setSaved({ id: data.id, url: data.url, metal });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  }

  const goldQuote = (saved?.metal ?? metal) === 'gold';
  const cta =
    goldQuote || siteMode !== 'preorder'
      ? siteMode === 'closed'
        ? 'Slots are full — join waitlist'
        : 'Join the waitlist'
      : 'Reserve your slot';

  const ctaHref = saved
    ? goldQuote || siteMode !== 'preorder'
      ? `/waitlist?design=${saved.id}`
      : `/checkout?design=${saved.id}`
    : null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-elevated p-4">
      <h2 className="font-display text-lg text-silver-bright">Save design</h2>
      {!saved ? (
        <>
          <label className="block text-sm text-text-muted">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-silver"
              autoComplete="email"
            />
          </label>
          {/* honeypot */}
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
            type="button"
            disabled={loading || !email}
            onClick={save}
            className="w-full rounded-md bg-silver-bright px-4 py-3 text-sm font-semibold text-bg hover:bg-silver disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save & get link'}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-ok">Saved. Share this link:</p>
          <a href={saved.url} className="block break-all text-sm text-silver underline">
            {saved.url}
          </a>
          {ctaHref && (
            <a
              href={ctaHref}
              className="block w-full rounded-md bg-silver-bright px-4 py-3 text-center text-sm font-semibold text-bg hover:bg-silver"
            >
              {cta}
            </a>
          )}
          {tier === 'founding' && siteMode === 'preorder' && (
            <p className="text-xs text-text-muted">
              Founding client pricing still open — softer rate while production gets dialed in.
              Locked for these first slots only.
            </p>
          )}
        </>
      )}
    </div>
  );
}
