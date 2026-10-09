'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCents } from '@/lib/pricing';
import { siteConfig } from '@/lib/site.config';
import { formatScanLimit } from '@/lib/scans';

type ScanInfo = {
  file_id: string;
  filename: string;
  size_bytes: number;
  uploaded_at: string;
  status: string;
};

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
  scan: ScanInfo | null;
};

type MoldPath = 'kit' | 'scan';

function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress: (pct: number) => void,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json });
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(form);
  });
}

export function OrderClient({ token }: { token: string }) {
  const [data, setData] = useState<OrderPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [path, setPath] = useState<MoldPath>('kit');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/orders/${token}`);
    if (!res.ok) {
      setError('Order not found');
      return;
    }
    const j = (await res.json()) as OrderPayload;
    setData(j);
    if (j.scan || j.order.fulfillment === 'dentist_scan') setPath('scan');
    else setPath('kit');
  }

  useEffect(() => {
    load();
  }, [token]);

  async function choosePath(next: MoldPath) {
    setPath(next);
    setError(null);
    const fulfillment = next === 'scan' ? 'dentist_scan' : 'kit_mail';
    try {
      await fetch(`/api/orders/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillment }),
      });
      await load();
    } catch {
      /* path still usable locally */
    }
  }

  async function onUploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
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

  async function onUploadScan(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      if (file.size > siteConfig.dentistScan.maxBytes) {
        throw new Error(
          `File too large (max ${formatScanLimit()}). Compress or export a smaller scan.`,
        );
      }
      const fd = new FormData();
      fd.append('file', file);
      fd.append('company', '');
      const { ok, status, json } = await uploadWithProgress(
        `/api/orders/${token}/scan`,
        fd,
        setUploadProgress,
      );
      if (!ok) {
        if (status === 413 || json.code === 'file_too_large') {
          throw new Error(
            String(json.error ?? `File too large (max ${formatScanLimit()})`),
          );
        }
        throw new Error(String(json.error ?? 'Upload failed'));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function deleteScan() {
    if (!window.confirm('Delete your dentist scan from this order?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${token}/scan`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Delete failed');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-text-muted">Loading…</p>;

  const { order, photos, events, scan } = data;
  const orderOpen = !['shipped', 'cancelled', 'refunded', 'pending_deposit'].includes(
    order.status,
  );
  const canUploadPhotos =
    orderOpen && photos.length < siteConfig.moldPhotoCount;
  const canUploadScan =
    orderOpen && (!scan || scan.status === 'needs_new_scan');

  const showBalance =
    order.status === 'final_photos_sent' || order.status === 'casting';

  const acceptScan = siteConfig.dentistScan.extensions.map((e) => `.${e}`).join(',');

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-bg-elevated p-4">
        <p className="text-xs tracking-wide text-steel uppercase">Status</p>
        <p className="mt-1 font-display text-xl text-silver-bright">
          {order.status.replace(/_/g, ' ')}
        </p>
        {order.tier === 'founding' && (
          <p className="mt-2 text-xs text-steel">Founding client. Fit check included.</p>
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

      {orderOpen && (
        <div className="rounded-lg border border-border p-4">
          <h2 className="font-display text-lg text-silver-bright">Mold</h2>
          <p className="mt-1 text-sm text-text-muted">
            Choose how we get your fit: kit photos or a dentist 3D scan.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => choosePath('kit')}
              className={`rounded-md border px-3 py-3 text-left text-sm ${
                path === 'kit'
                  ? 'border-silver bg-bg-elevated text-silver-bright'
                  : 'border-border text-text-muted'
              }`}
            >
              <span className="font-medium">Send me a mold kit</span>
              <span className="mt-1 block text-xs text-steel">
                We mail a kit; upload photos when it arrives.
              </span>
            </button>
            <button
              type="button"
              onClick={() => choosePath('scan')}
              className={`rounded-md border px-3 py-3 text-left text-sm ${
                path === 'scan'
                  ? 'border-silver bg-bg-elevated text-silver-bright'
                  : 'border-border text-text-muted'
              }`}
            >
              <span className="font-medium">I have a dentist 3D scan</span>
              <span className="mt-1 block text-xs text-steel">
                Upload .stl, .obj, or .ply (max {formatScanLimit()}).
              </span>
            </button>
          </div>

          {path === 'kit' && canUploadPhotos && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm text-text-muted">
                Upload {siteConfig.moldPhotoCount} photos from different angles (max 10 MB
                each).
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => onUploadPhotos(e.target.files)}
                className="mt-3 block w-full text-sm text-text-muted"
              />
              {uploading && <p className="mt-2 text-sm text-steel">Uploading…</p>}
            </div>
          )}

          {path === 'scan' && (
            <div className="mt-4 border-t border-border pt-4">
              {scan && scan.status !== 'needs_new_scan' ? (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-silver">{scan.filename}</span>
                    <span className="text-text-muted">
                      {' '}
                      · {(scan.size_bytes / (1024 * 1024)).toFixed(1)} MB ·{' '}
                      {scan.status.replace(/_/g, ' ')}
                    </span>
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={deleteScan}
                    className="text-xs text-danger underline"
                  >
                    Delete my scan
                  </button>
                </div>
              ) : (
                canUploadScan && (
                  <>
                    {scan?.status === 'needs_new_scan' && (
                      <p className="mb-2 text-sm text-danger">
                        We need a new scan. Upload a replacement below.
                      </p>
                    )}
                    <input
                      type="file"
                      accept={acceptScan}
                      disabled={uploading}
                      onChange={(e) => onUploadScan(e.target.files)}
                      className="block w-full text-sm text-text-muted"
                    />
                    {uploadProgress != null && (
                      <p className="mt-2 text-sm text-steel">Uploading… {uploadProgress}%</p>
                    )}
                    <p className="mt-3 text-xs text-text-muted">
                      Used only to make your piece. Delete on request.{' '}
                      <Link href="/privacy" className="text-silver underline">
                        Privacy
                      </Link>
                    </p>
                  </>
                )
              )}
            </div>
          )}
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
              {e.note ? `: ${e.note}` : ''}
            </li>
          ))}
        </ol>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
