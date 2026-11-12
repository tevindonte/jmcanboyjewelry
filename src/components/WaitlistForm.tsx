'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [errorField, setErrorField] = useState<'name' | 'email' | 'form' | null>(null);
  const [result, setResult] = useState<{
    position: number;
    referralLink: string;
    alreadyJoined?: boolean;
  } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!error || !errorField) return;
    const target =
      errorField === 'name'
        ? nameRef.current
        : errorField === 'email'
          ? emailRef.current
          : errorRef.current;
    target?.focus();
  }, [error, errorField]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter your name.');
      setErrorField('name');
      return;
    }
    if (!email.trim()) {
      setError('Enter your email.');
      setErrorField('email');
      return;
    }
    setLoading(true);
    setError(null);
    setErrorField(null);
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
      setErrorField('form');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div
        className="space-y-4 rounded-lg border border-border bg-bg-elevated p-5"
        role="status"
        aria-live="polite"
      >
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
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && (
        <div
          ref={errorRef}
          id="waitlist-error"
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger outline-none"
        >
          {error}
        </div>
      )}
      <label className="block text-sm text-text-muted">
        Name
        <input
          ref={nameRef}
          required
          autoComplete="name"
          value={name}
          aria-invalid={errorField === 'name'}
          aria-describedby={errorField === 'name' ? 'waitlist-error' : undefined}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-silver"
        />
      </label>
      <label className="block text-sm text-text-muted">
        Email
        <input
          ref={emailRef}
          type="email"
          required
          autoComplete="email"
          value={email}
          aria-invalid={errorField === 'email'}
          aria-describedby={errorField === 'email' ? 'waitlist-error' : undefined}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-silver"
        />
      </label>
      <label className="block text-sm text-text-muted">
        Phone <span className="text-steel-dim">(optional)</span>
        <input
          type="tel"
          autoComplete="tel"
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
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="min-h-11 w-full rounded-md bg-silver-bright px-4 py-3 text-sm font-semibold text-bg disabled:opacity-50"
      >
        {loading ? 'Joining…' : 'Join waitlist'}
      </button>
    </form>
  );
}
