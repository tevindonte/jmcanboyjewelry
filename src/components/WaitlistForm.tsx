'use client';

import { useState } from 'react';

export function WaitlistForm({
  referralCode,
  designId,
}: {
  referralCode?: string;
  designId?: string;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    position: number;
    referralLink: string;
    alreadyJoined?: boolean;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || null,
          referralCode: referralCode || null,
          honeypot,
          designId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setResult({
        position: data.position,
        referralLink: data.referralLink,
        alreadyJoined: data.alreadyJoined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-bg-elevated p-5">
        <p className="text-ok">
          {result.alreadyJoined ? "You're already on the list." : "You're on the list."}
        </p>
        <p className="font-display text-4xl text-silver-bright">#{result.position}</p>
        <p className="text-sm text-text-muted">Your approximate position right now.</p>
        <div>
          <p className="text-sm text-text-muted">Your referral link</p>
          <a href={result.referralLink} className="mt-1 block break-all text-sm text-silver">
            {result.referralLink}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm text-text-muted">
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-silver"
        />
      </label>
      <label className="block text-sm text-text-muted">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-silver"
        />
      </label>
      <label className="block text-sm text-text-muted">
        Phone <span className="text-steel-dim">(optional)</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-silver"
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
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-silver-bright px-4 py-3 text-sm font-semibold text-bg disabled:opacity-50"
      >
        {loading ? 'Joining…' : 'Join waitlist'}
      </button>
    </form>
  );
}
