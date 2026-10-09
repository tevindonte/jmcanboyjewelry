'use client';

import { useEffect, useState } from 'react';
import { formatUsd } from '@/lib/pricing';

type PricingPayload = {
  reference: number;
  applied: number;
  latest: { usd_per_oz: number; fetched_at: string; source: string } | null;
  atApplied: Record<
    string,
    { adjustUsd: number; unitUsd: number | null; foundryUsd: number | null }
  >;
  pending: Record<
    string,
    { adjustUsd: number; unitUsd: number | null; foundryUsd: number | null }
  >;
  perToothBase: Record<string, number | null>;
  gramsPerTooth: Record<string, number | null>;
  minimumOrder: number | null;
  kitFee: number | null;
  providerConfigured: boolean;
};

export function AdminPricingPanel() {
  const [data, setData] = useState<PricingPayload | null>(null);
  const [manualSpot, setManualSpot] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/pricing');
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const spot = Number(manualSpot);
    if (!spot || spot <= 0) {
      setMsg('Enter a valid $/oz');
      return;
    }
    const res = await fetch('/api/admin/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spot, applyNow: true }),
    });
    const j = await res.json();
    if (res.ok) {
      setMsg(`Applied spot $${j.applied_spot}`);
      setManualSpot('');
      await load();
    } else setMsg(j.error ?? 'Failed');
  }

  async function applyLatest() {
    const res = await fetch('/api/admin/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useLatest: true, applyNow: true }),
    });
    const j = await res.json();
    if (res.ok) {
      setMsg(`Applied spot: $${j.applied_spot}`);
      await load();
    } else setMsg(j.error ?? 'Failed');
  }

  if (!data) {
    return (
      <section className="mt-6 rounded-lg border border-border p-4 text-sm text-text-muted">
        Loading pricing…
      </section>
    );
  }

  const styles = ['plain', 'window', 'deepcut'] as const;

  return (
    <section className="mt-6 rounded-lg border border-border p-4">
      <h2 className="font-display text-lg text-silver-bright">Pricing</h2>
      <p className="mt-1 text-sm text-text-muted">
        Silver moves ~$1.50/tooth per $20 spot change. On free Render, type the spot in weekly.
        No cron needed.
      </p>

      <form onSubmit={submitManual} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm text-text-muted">
          Manual spot ($/oz)
          <input
            type="number"
            step="0.01"
            min="1"
            value={manualSpot}
            onChange={(e) => setManualSpot(e.target.value)}
            placeholder={String(data.applied)}
            className="mt-1 block w-36 rounded-md border border-border bg-bg px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-silver-bright px-3 py-2 text-sm font-semibold text-bg"
        >
          Save &amp; apply
        </button>
        {data.latest && (
          <button
            type="button"
            onClick={applyLatest}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            Apply latest recorded
          </button>
        )}
      </form>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-text-muted">Reference spot</dt>
          <dd>${data.reference.toFixed(2)}/oz</dd>
        </div>
        <div>
          <dt className="text-text-muted">Applied spot</dt>
          <dd>${data.applied.toFixed(2)}/oz</dd>
        </div>
        <div>
          <dt className="text-text-muted">Last recorded</dt>
          <dd>
            {data.latest
              ? `$${Number(data.latest.usd_per_oz).toFixed(2)} (${data.latest.source})`
              : 'None yet'}
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-xs text-steel">
        Min order {formatUsd(data.minimumOrder)} · Kit fee {formatUsd(data.kitFee)} (credited;
        mail only) · API provider:{' '}
        {data.providerConfigured ? 'configured' : 'off (manual is fine)'}
      </p>

      <table className="mt-4 w-full text-left text-xs">
        <thead className="text-text-muted">
          <tr>
            <th className="py-1">Style</th>
            <th>Base</th>
            <th>Adjust</th>
            <th>Live unit</th>
            <th>Foundry est.</th>
            <th>Grams</th>
          </tr>
        </thead>
        <tbody>
          {styles.map((s) => (
            <tr key={s} className="border-t border-border">
              <td className="py-2">{s}</td>
              <td>{formatUsd(data.perToothBase[s])}</td>
              <td>{formatUsd(data.atApplied[s]?.adjustUsd ?? 0)}</td>
              <td>{formatUsd(data.atApplied[s]?.unitUsd)}</td>
              <td>{formatUsd(data.atApplied[s]?.foundryUsd)}</td>
              <td>
                {data.gramsPerTooth[s] ?? (
                  <span className="text-steel">TODO(owner)</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {msg && <p className="mt-2 text-sm text-ok">{msg}</p>}
      <p className="mt-2 text-xs text-steel-dim">
        Existing orders keep their <code>price_snapshot</code>. Foundry numbers are still
        placeholders.
      </p>
    </section>
  );
}
