'use client';

import { useEffect, useRef, useState } from 'react';
import { siteConfig } from '@/lib/site.config';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<'name' | 'email' | 'message' | 'form' | null>(
    null,
  );
  const [sent, setSent] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!error || !errorField) return;
    const target =
      errorField === 'name'
        ? nameRef.current
        : errorField === 'email'
          ? emailRef.current
          : errorField === 'message'
            ? messageRef.current
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
    if (message.trim().length < 8) {
      setError('Write a short message (at least a sentence).');
      setErrorField('message');
      return;
    }
    setLoading(true);
    setError(null);
    setErrorField(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setErrorField('form');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div
        className="rounded-lg border border-border bg-bg-elevated p-5"
        role="status"
        aria-live="polite"
      >
        <p className="text-ok">Message sent. We&apos;ll get back to you.</p>
        <p className="mt-2 text-sm text-text-muted">
          Or email{' '}
          <a href={`mailto:${siteConfig.contactEmail}`} className="text-silver underline">
            {siteConfig.contactEmail}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && (
        <div
          ref={errorRef}
          id="contact-error"
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
          type="text"
          required
          autoComplete="name"
          value={name}
          aria-invalid={errorField === 'name'}
          aria-describedby={error ? 'contact-error' : undefined}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-silver"
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
          aria-describedby={error ? 'contact-error' : undefined}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-silver"
        />
      </label>

      <label className="block text-sm text-text-muted">
        Message
        <textarea
          ref={messageRef}
          required
          rows={5}
          value={message}
          aria-invalid={errorField === 'message'}
          aria-describedby={error ? 'contact-error' : undefined}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-silver"
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
        className="min-h-11 w-full rounded-md bg-silver-bright px-4 py-3 text-sm font-semibold text-bg hover:bg-silver disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
