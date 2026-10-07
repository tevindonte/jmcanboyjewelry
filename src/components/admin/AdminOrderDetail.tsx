'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCents } from '@/lib/pricing';

type Detail = {
  order: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    status: string;
    tier: string;
    fulfillment: string;
    total_cents: number;
    deposit_cents: number;
    balance_cents: number;
    tracking_number: string | null;
    access_token: string;
    media_consent_at: string | null;
  };
  design: { arch: string; teeth: Record<string, string> } | null;
  events: { type: string; note: string | null; created_at: string }[];
  photos: {
    id: string;
    status: string;
    reviewer_note: string | null;
    url: string | null;
  }[];
  cost: {
    totalCostUsd: number | null;
    foundryUsd: number | null;
    resinUsd: number | null;
    kitCostUsd: number | null;
    shippingUsd: number | null;
  } | null;
  marginCents: number | null;
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

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [status, setStatus] = useState('');
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/orders/${orderId}`);
    if (!res.ok) return;
    const j = await res.json();
    setData(j);
    setStatus(j.order.status);
    setTracking(j.order.tracking_number ?? '');
  }

  useEffect(() => {
    load();
  }, [orderId]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) setMsg(j.error ?? 'Failed');
    else {
      setMsg('Saved');
      if (j.deleted) {
        window.location.href = '/admin';
        return;
      }
      await load();
    }
  }

  async function reviewPhoto(photoId: string, photoStatus: 'approved' | 'rejected') {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId, status: photoStatus, note }),
    });
    if (res.ok) {
      setMsg(`Photo ${photoStatus}`);
      await load();
    }
  }

  async function sendBalance() {
    const res = await fetch('/api/checkout/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    const j = await res.json();
    setMsg(res.ok ? 'Balance link emailed' : j.error ?? 'Failed');
  }

  if (!data) return <main className="p-8 text-text-muted">Loading…</main>;
  const { order, photos, events, cost, marginCents } = data;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-sm text-steel hover:text-silver">
        ← Orders
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-silver-bright">{order.name}</h1>
      <p className="text-sm text-text-muted">
        {order.email} · {order.phone ?? 'no phone'} · tier {order.tier}
      </p>
      <p className="mt-1 text-xs text-steel">
        Media consent:{' '}
        {order.media_consent_at
          ? new Date(order.media_consent_at).toLocaleString()
          : 'none'}
        {' · '}
        <a href={`/order/${order.access_token}`} className="underline">
          Customer order link
        </a>
      </p>

      {msg && <p className="mt-4 text-sm text-ok">{msg}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-text-muted">Total</dt>
          <dd>{formatCents(order.total_cents)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Deposit / Balance</dt>
          <dd>
            {formatCents(order.deposit_cents)} / {formatCents(order.balance_cents)}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Est. cost</dt>
          <dd>
            {cost?.totalCostUsd != null
              ? `$${cost.totalCostUsd.toFixed(2)}`
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Est. margin</dt>
          <dd>{marginCents != null ? formatCents(marginCents) : '—'}</dd>
        </div>
      </dl>

      <section className="mt-8 space-y-3 rounded-lg border border-border p-4">
        <label className="block text-sm">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Note
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2"
          />
        </label>
        <label className="block text-sm">
          Tracking
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => patch({ status, tracking_number: tracking, note })}
            className="rounded-md bg-silver-bright px-3 py-2 text-sm font-semibold text-bg"
          >
            Save status
          </button>
          <button
            type="button"
            onClick={sendBalance}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            Send balance link
          </button>
          <button
            type="button"
            onClick={() => {
              const n = window.prompt('Required note for in-person balance');
              if (n) patch({ markBalancePaidInPerson: true, note: n });
            }}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            Mark balance paid (in person)
          </button>
          {order.tier === 'founding' && !order.media_consent_at && (
            <button
              type="button"
              onClick={() =>
                patch({
                  waiveMediaConsent: true,
                  note: 'Admin waived media consent',
                })
              }
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              Waive media consent
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete customer data and photos?')) {
                patch({ deleteCustomerData: true });
              }
            }}
            className="rounded-md border border-danger px-3 py-2 text-sm text-danger"
          >
            Delete data
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg text-silver-bright">Mold photos</h2>
        <ul className="mt-3 space-y-4">
          {photos.map((p) => (
            <li key={p.id} className="rounded-md border border-border p-3">
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="Mold" className="max-h-48 rounded" />
              ) : (
                <p className="text-sm text-steel">No signed URL</p>
              )}
              <p className="mt-2 text-xs text-steel">{p.status}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => reviewPhoto(p.id, 'approved')}
                  className="text-xs text-ok underline"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => reviewPhoto(p.id, 'rejected')}
                  className="text-xs text-danger underline"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg text-silver-bright">Events</h2>
        <ol className="mt-3 space-y-1 text-sm text-text-muted">
          {events.map((e, i) => (
            <li key={i}>
              {new Date(e.created_at).toLocaleString()} — {e.type}
              {e.note ? `: ${e.note}` : ''}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
