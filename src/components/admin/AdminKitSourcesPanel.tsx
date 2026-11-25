'use client';

import { useEffect, useState } from 'react';
import type { KitSource } from '@/lib/kit-sources.config';

export function AdminKitSourcesPanel({ compact }: { compact?: boolean }) {
  const [sources, setSources] = useState<KitSource[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/kit-sources');
    const data = await res.json();
    if (res.ok) setSources(data.sources ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  function update(id: string, patch: Partial<KitSource>) {
    setSources((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/kit-sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: sources.map((s) => ({
            id: s.id,
            url: s.url,
            seenPriceUsd: s.seenPriceUsd,
            deliveryNote: s.deliveryNote,
            sellerNote: s.sellerNote,
            notes: s.notes,
            label: s.label,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSources(data.sources ?? []);
      setMsg('Kit sources saved');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={
        compact
          ? 'space-y-3'
          : 'mx-auto max-w-3xl space-y-4 px-4 py-10'
      }
    >
      {!compact && (
        <div>
          <h1 className="font-display text-2xl font-bold text-silver-bright">
            Kit sources
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Admin only. Seller names stay here — never on customer pages.
          </p>
        </div>
      )}
      {compact && (
        <h2 className="font-display text-lg text-silver-bright">Kit sources</h2>
      )}

      <div className="space-y-4">
        {sources.map((s) => (
          <div
            key={s.id}
            className="space-y-2 rounded-md border border-border bg-bg-elevated p-3 text-sm"
          >
            <p className="font-medium text-silver-bright">{s.label}</p>
            <label className="block text-text-muted">
              URL
              <input
                value={s.url}
                onChange={(e) => update(s.id, { url: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                placeholder="https://…"
              />
            </label>
            <label className="block text-text-muted">
              Seen price (USD)
              <input
                type="number"
                step="0.01"
                value={s.seenPriceUsd ?? ''}
                onChange={(e) =>
                  update(s.id, {
                    seenPriceUsd: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>
            <label className="block text-text-muted">
              Delivery note
              <input
                value={s.deliveryNote}
                onChange={(e) => update(s.id, { deliveryNote: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>
            <label className="block text-text-muted">
              Seller note (admin only)
              <input
                value={s.sellerNote}
                onChange={(e) => update(s.id, { sellerNote: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>
            <label className="block text-text-muted">
              Notes
              <textarea
                value={s.notes}
                onChange={(e) => update(s.id, { notes: e.target.value })}
                rows={compact ? 2 : 3}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>
            {s.url.trim() && (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-silver underline"
              >
                Open link
              </a>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={busy || sources.length === 0}
        onClick={() => void save()}
        className="min-h-11 rounded-md bg-silver-bright px-4 py-2 text-sm font-semibold text-bg hover:bg-silver disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save kit sources'}
      </button>
      {msg && <p className="text-sm text-ok">{msg}</p>}
    </section>
  );
}
