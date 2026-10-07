'use client';

import { useEffect, useState } from 'react';
import { formatCents } from '@/lib/pricing';
import { siteConfig } from '@/lib/site.config';

type OrderPayload = {
  order: {
    id: string;
    status: string;
    tier: string;
    total_cents: number;
    deposit_cents: number;
    balance_cents: number;
    fulfillment: string;
    tracking_number: string | null;
    name: string;
  };
  design: { arch: string; teeth: Record<string, string> } | null;
  events: { type: string; note: string | null; created_at: string }[];
  photos: { id: string; status: string; reviewer_note: string | null }[];
};

export function OrderClient({ token }: { token: string }) {
  const [data, setData] = useState<OrderPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const res = await fetch(`/api/orders/${token}`);
    if (!res.ok) {
      setError('Order not found');
      return;
    }
    setData(await res.json());
  }

  useEffect(() => {
    load();
  }, [token]);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, siteConfig.moldPhotoCount)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('company', '');
        const res = await fetch(`/api/orders/${token}/photos`, { method: 'POST', body: fd });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j.error ?? 'Upload failed');
        }
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (error && !data) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-text-muted">Loading…</p>;

  const { order, photos, events } = data;
  const canUpload =
    order.status !== 'pending_deposit' &&
    photos.length < siteConfig.moldPhotoCount &&
    !['shipped', 'cancelled', 'refunded'].includes(order.status);

  const showBalance =
    order.status === 'final_photos_sent' || order.status === 'casting';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-bg-elevated p-4">
        <p className="text-xs tracking-wide text-steel uppercase">Status</p>
        <p className="mt-1 font-display text-xl text-silver-bright">
          {order.status.replace(/_/g, ' ')}
        </p>
        {order.tier === 'founding' && (
          <p className="mt-2 text-xs text-steel">Founding client — fit check included.</p>
        )}
        {order.tier === 'friend' && (
          <p className="mt-2 text-xs text-steel">Friend / custom order.</p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-text-muted">Total</dt>
            <dd>{formatCents(order.total_cents)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Deposit</dt>
            <dd>{formatCents(order.deposit_cents)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Balance</dt>
            <dd>{formatCents(order.balance_cents)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Fulfillment</dt>
            <dd>{order.fulfillment.replace(/_/g, ' ')}</dd>
          </div>
        </dl>
        {order.tracking_number && (
          <p className="mt-3 text-sm">
            Tracking: <span className="text-silver">{order.tracking_number}</span>
          </p>
        )}
      </div>

      {canUpload && (
        <div className="rounded-lg border border-border p-4">
          <h2 className="font-display text-lg text-silver-bright">Mold photos</h2>
          <p className="mt-1 text-sm text-text-muted">
            Upload {siteConfig.moldPhotoCount} photos from different angles (max 10 MB each).
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files)}
            className="mt-3 block w-full text-sm text-text-muted"
          />
          {uploading && <p className="mt-2 text-sm text-steel">Uploading…</p>}
        </div>
      )}

      {photos.length > 0 && (
        <ul className="space-y-2 text-sm">
          {photos.map((p) => (
            <li key={p.id} className="flex justify-between border-b border-border py-2">
              <span>Photo</span>
              <span className="text-steel">{p.status}</span>
            </li>
          ))}
        </ul>
      )}

      {showBalance && (
        <p className="text-sm text-text-muted">
          Balance payment link is emailed when your piece is ready. Check your inbox.
        </p>
      )}

      <div>
        <h2 className="font-display text-lg text-silver-bright">Timeline</h2>
        <ol className="mt-3 space-y-2 text-sm text-text-muted">
          {events.map((e, i) => (
            <li key={`${e.created_at}-${i}`}>
              <span className="text-silver">{e.type.replace(/_/g, ' ')}</span>
              {e.note ? ` — ${e.note}` : ''}
            </li>
          ))}
        </ol>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
