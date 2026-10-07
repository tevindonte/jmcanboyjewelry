'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCents } from '@/lib/pricing';
import type { AppSettings } from '@/lib/settings';
import type { SiteMode } from '@/lib/site.config';
import { AdminPricingPanel } from './AdminPricingPanel';
import { AdminCreateOrder } from './AdminCreateOrder';

type OrderRow = {
  id: string;
  email: string;
  name: string;
  status: string;
  tier: string;
  total_cents: number;
  created_at: string;
};

const STATUSES = [
  'pending_deposit',
  'deposit_paid',
  'kit_shipped',
  'impression_scheduled',
  'mold_photos_pending',
  'mold_photos_approved',
  'mold_received',
  'designing',
  'casting',
  'final_photos_sent',
  'balance_paid',
  'shipped',
  'cancelled',
  'refunded',
];

export function AdminDashboard({
  settings: initial,
  foundingRemaining,
  foundingTotal,
}: {
  settings: AppSettings;
  foundingRemaining: number;
  foundingTotal: number;
}) {
  const [settings, setSettings] = useState(initial);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function loadOrders(filter?: string) {
    const q = filter ? `?status=${filter}` : '';
    const res = await fetch(`/api/admin/orders${q}`);
    const data = await res.json();
    if (res.ok) setOrders(data.orders ?? []);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function saveSettings(partial: Partial<AppSettings>) {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    if (res.ok) {
      setSettings(data);
      setMsg('Settings saved');
    } else setMsg(data.error ?? 'Failed');
  }

  async function launch() {
    const res = await fetch('/api/admin/launch', { method: 'POST' });
    const data = await res.json();
    if (res.ok) setMsg(`Launch emails: sent ${data.sent}, remaining ${data.remaining}`);
    else setMsg(data.error ?? 'Failed');
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-silver-bright">Admin</h1>
        <a href="/api/admin/export" className="text-sm text-silver underline">
          Export CSV
        </a>
      </div>

      {msg && <p className="mt-4 text-sm text-ok">{msg}</p>}

      <section className="mt-8 grid gap-4 rounded-lg border border-border bg-bg-elevated p-4 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-lg text-silver-bright">Site mode</h2>
          <select
            value={settings.site_mode}
            onChange={(e) => saveSettings({ site_mode: e.target.value as SiteMode })}
            className="mt-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
          >
            <option value="waitlist">waitlist</option>
            <option value="preorder">preorder</option>
            <option value="closed">closed</option>
          </select>
        </div>
        <div>
          <h2 className="font-display text-lg text-silver-bright">Public</h2>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.site_public}
              onChange={(e) => saveSettings({ site_public: e.target.checked })}
            />
            site_public (launch)
          </label>
          <p className="mt-2 text-xs text-steel">
            Founding: {foundingRemaining} of {foundingTotal} left (friend orders excluded)
          </p>
          <label className="mt-2 block text-xs text-text-muted">
            Founding slots total
            <input
              type="number"
              defaultValue={settings.founding_slots_total}
              onBlur={(e) =>
                saveSettings({ founding_slots_total: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1"
            />
          </label>
        </div>
      </section>

      <AdminPricingPanel />

      <AdminCreateOrder onCreated={() => loadOrders(status || undefined)} />

      <section className="mt-6 rounded-lg border border-border p-4">
        <h2 className="font-display text-lg text-silver-bright">Launch</h2>
        <p className="mt-1 text-sm text-text-muted">
          Email waitlist that pre-orders are open (batched, skips unsubscribed).
        </p>
        <button
          type="button"
          onClick={launch}
          className="mt-3 rounded-md border border-silver px-4 py-2 text-sm text-silver"
        >
          Email waitlist
        </button>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-lg text-silver-bright">Orders</h2>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              loadOrders(e.target.value || undefined);
            }}
            className="rounded-md border border-border bg-bg px-2 py-1 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {orders.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <div>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="text-silver-bright hover:underline"
                >
                  {o.name}
                </Link>
                <span className="text-text-muted"> · {o.email}</span>
                <p className="text-xs text-steel">
                  {o.status} · {o.tier} · {formatCents(o.total_cents)}
                </p>
              </div>
              <Link href={`/admin/orders/${o.id}`} className="text-xs text-steel underline">
                Open
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
