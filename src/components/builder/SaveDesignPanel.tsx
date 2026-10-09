'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderStore } from '@/store/builder-store';
import type { SiteMode } from '@/lib/site.config';

function selectedToothCount(teeth: Record<string, string>) {
  return Object.values(teeth).filter((s) => s && s !== 'none').length;
}

function shareUrl(id: string) {
  return `${window.location.origin}/d/${id}`;
}

export function SaveDesignPanel({
  siteMode,
  tier,
}: {
  siteMode: SiteMode;
  tier: 'founding' | 'friend' | 'standard';
}) {
  const router = useRouter();
  const arch = useBuilderStore((s) => s.arch);
  const metal = useBuilderStore((s) => s.metal);
  const teeth = useBuilderStore((s) => s.teeth);
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    designUrl: string;
    waitlistPosition?: number;
    referralLink?: string;
    alreadyJoined?: boolean;
  } | null>(null);

  async function saveDesign() {
    const res = await fetch('/api/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, arch, teeth, metal, honeypot }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Could not save design');
    return data as { id: string; url: string; metal: string };
  }

  async function onPrimary() {
    setLoading(true);
    setError(null);
    try {
      if (selectedToothCount(teeth) === 0) {
        throw new Error('Pick at least one tooth to continue.');
      }
      if (!email.trim()) {
        throw new Error('Enter your email to continue.');
      }

      const goldQuote = metal === 'gold';
      const design = await saveDesign();
      const designUrl = shareUrl(design.id);

      if (goldQuote || siteMode === 'waitlist' || siteMode === 'closed') {
        const nameGuess = email.split('@')[0]?.trim() || 'Friend';
        const wl = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: nameGuess,
            phone: null,
            honeypot,
            designId: design.id,
          }),
        });
        const wlData = await wl.json();
        if (!wl.ok) throw new Error(wlData.error ?? 'Could not join waitlist');
        setDone({
          designUrl,
          waitlistPosition: wlData.position,
          referralLink:
            typeof window !== 'undefined' && wlData.referralLink
              ? wlData.referralLink.replace(
                  /^https?:\/\/[^/]+/,
                  window.location.origin,
                )
              : wlData.referralLink,
          alreadyJoined: wlData.alreadyJoined,
        });
        return;
      }

      // Preorder: one email, then checkout (no second email prompt).
      router.push(
        `/checkout?design=${encodeURIComponent(design.id)}&email=${encodeURIComponent(email)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const primaryLabel =
    metal === 'gold' || siteMode !== 'preorder'
      ? siteMode === 'closed'
        ? 'Slots are full. Join waitlist'
        : 'Join the waitlist'
      : 'Reserve your slot';

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-elevated p-4">
      <h2 className="font-display text-lg text-silver-bright">
        {siteMode === 'preorder' && metal !== 'gold' ? 'Reserve' : 'Join the list'}
      </h2>

      {!done ? (
        <>
          <p className="text-sm text-text-muted">
            {siteMode === 'preorder' && metal !== 'gold'
              ? 'Email once. Next screen is checkout for the deposit.'
              : 'Email once. We save your design and put you on the waitlist.'}
          </p>
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
            onClick={onPrimary}
            className="w-full rounded-md bg-silver-bright px-4 py-3 text-sm font-semibold text-bg hover:bg-silver disabled:opacity-50"
          >
            {loading ? 'Working…' : primaryLabel}
          </button>
          {tier === 'founding' && siteMode === 'preorder' && metal !== 'gold' && (
            <p className="text-xs text-text-muted">
              Founding client pricing still open. Softer rate while production gets dialed in.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-ok">
            {done.alreadyJoined
              ? 'You are already on the waitlist. Design saved.'
              : 'You are on the waitlist. Design saved.'}
          </p>
          {done.waitlistPosition != null && (
            <p className="text-sm text-text-muted">
              Approximate spot:{' '}
              <span className="text-silver-bright">#{done.waitlistPosition}</span>
            </p>
          )}
          <p className="text-sm text-text-muted">Share your design:</p>
          <a href={done.designUrl} className="block break-all text-sm text-silver underline">
            {done.designUrl}
          </a>
          {done.referralLink && (
            <>
              <p className="mt-2 text-sm text-text-muted">Your referral link:</p>
              <a
                href={done.referralLink}
                className="block break-all text-sm text-silver underline"
              >
                {done.referralLink}
              </a>
            </>
          )}
        </>
      )}
    </div>
  );
}
