import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { orderStatusSchema } from '@/lib/validations';
import {
  calculateEstimate,
  estimateOrderCost,
  type FulfillmentChoice,
  type TeethMap,
} from '@/lib/pricing';
import { normalizeMetalId, type ArchChoice } from '@/lib/pricing.config';
import { getSettings } from '@/lib/settings';
import { sendMoldReviewResult, sendScanReviewResult } from '@/lib/email';
import { createAdminClient } from '@/lib/appwrite/admin';
import { normalizeScanStatus } from '@/lib/scans';
import { scanDownloadUrl } from '@/lib/signed-download';
import {
  getDoc,
  listDocs,
  updateDoc,
  createDoc,
  deleteDoc,
  col,
  Query,
  APPWRITE,
} from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const settings = await getSettings();
  const order = await getDoc(col.orders, id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const designDoc = await getDoc(col.designs, String(order.design_id));
  const teeth = designDoc
    ? (JSON.parse(String(designDoc.teeth_json ?? '{}')) as TeethMap)
    : {};

  const { documents: events } = await listDocs(col.orderEvents, [
    Query.equal('order_id', id),
    Query.orderAsc('$createdAt'),
    Query.limit(200),
  ]);

  const { documents: photos } = await listDocs(col.moldPhotos, [
    Query.equal('order_id', id),
    Query.orderAsc('$createdAt'),
    Query.limit(20),
  ]);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const signed = photos.map((photo) => ({
    id: photo.$id,
    status: photo.status,
    reviewer_note: photo.reviewer_note || null,
    storage_path: photo.storage_path,
    url: `${base}/api/admin/photos/${photo.storage_path}`,
  }));

  const snap = order.price_snapshot_json
    ? (JSON.parse(String(order.price_snapshot_json)) as { appliedSpot?: number })
    : null;
  const snapSpot = snap?.appliedSpot ?? settings.applied_spot;

  const cost = designDoc
    ? estimateOrderCost(
        teeth,
        order.fulfillment as FulfillmentChoice,
        snapSpot,
        Number(order.total_cents),
      )
    : null;

  const scanFileId = String(order.scan_file_id || '');
  const scan = scanFileId
    ? {
        file_id: scanFileId,
        filename: String(order.scan_filename || 'scan'),
        size_bytes: Number(order.scan_size_bytes || 0),
        uploaded_at: String(order.scan_uploaded_at || ''),
        status: normalizeScanStatus(order.scan_status) || 'received',
        download_url: scanDownloadUrl(
          scanFileId,
          String(order.scan_filename || 'scan'),
        ),
      }
    : null;

  return NextResponse.json({
    order: {
      ...order,
      id: order.$id,
      media_consent_at: order.media_consent_at || null,
      tracking_number: order.tracking_number || null,
      price_snapshot: snap,
    },
    design: designDoc
      ? {
          id: designDoc.$id,
          arch: designDoc.arch,
          teeth,
          email: designDoc.email,
          metal: normalizeMetalId(designDoc.metal ?? order.metal),
        }
      : null,
    events: events.map((e) => ({
      type: e.type,
      note: e.note || null,
      created_at: e.$createdAt,
    })),
    photos: signed,
    scan,
    cost,
    marginCents: cost?.marginCents ?? null,
  });
}

const patchSchema = z.object({
  status: orderStatusSchema.optional(),
  tracking_number: z.string().max(120).optional().nullable(),
  note: z.string().max(2000).optional(),
  markBalancePaidInPerson: z.boolean().optional(),
  deleteCustomerData: z.boolean().optional(),
  waiveMediaConsent: z.boolean().optional(),
  /** Manual quote for gold (or friend) — sets total / deposit / balance. */
  price_override_cents: z.number().int().positive().optional().nullable(),
  purgeScan: z.boolean().optional(),
  scanStatus: z.enum(['approved', 'needs_new_scan']).optional(),
  scanReason: z.string().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const order = await getDoc(col.orders, id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.deleteCustomerData) {
    const { storage } = createAdminClient();
    const { documents: photos } = await listDocs(col.moldPhotos, [
      Query.equal('order_id', id),
      Query.limit(50),
    ]);
    for (const p of photos) {
      try {
        await storage.deleteFile(APPWRITE.bucketMoldPhotos, String(p.storage_path));
      } catch {
        /* ignore */
      }
      await deleteDoc(col.moldPhotos, p.$id);
    }
    const scanFileId = String(order.scan_file_id || '');
    if (scanFileId) {
      try {
        await storage.deleteFile(APPWRITE.bucketScans, scanFileId);
      } catch {
        /* ignore */
      }
    }
    const { documents: events } = await listDocs(col.orderEvents, [
      Query.equal('order_id', id),
      Query.limit(500),
    ]);
    for (const e of events) await deleteDoc(col.orderEvents, e.$id);
    await deleteDoc(col.orders, id);
    if (order.design_id) {
      try {
        await deleteDoc(col.designs, String(order.design_id));
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json({ deleted: true });
  }

  if (parsed.data.purgeScan) {
    const { storage } = createAdminClient();
    const scanFileId = String(order.scan_file_id || '');
    if (scanFileId) {
      try {
        await storage.deleteFile(APPWRITE.bucketScans, scanFileId);
      } catch {
        /* ignore */
      }
    }
    await updateDoc(col.orders, id, {
      scan_file_id: '',
      scan_filename: '',
      scan_size_bytes: 0,
      scan_uploaded_at: '',
      scan_status: '',
    });
    await createDoc(col.orderEvents, {
      order_id: id,
      type: 'scan_purged',
      note: parsed.data.note ?? 'Admin purged dentist scan',
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.scanStatus) {
    const status = parsed.data.scanStatus;
    const reason = parsed.data.scanReason ?? parsed.data.note ?? '';
    if (!String(order.scan_file_id || '')) {
      return NextResponse.json({ error: 'No scan on this order' }, { status: 400 });
    }
    await updateDoc(col.orders, id, { scan_status: status });
    if (status === 'approved') {
      await updateDoc(col.orders, id, { status: 'mold_photos_approved' });
    }
    await createDoc(col.orderEvents, {
      order_id: id,
      type: status === 'approved' ? 'scan_approved' : 'scan_needs_new',
      note: reason,
    });
    try {
      await sendScanReviewResult({
        to: String(order.email),
        name: String(order.name),
        approved: status === 'approved',
        reason: reason || null,
        accessToken: String(order.access_token),
      });
    } catch (e) {
      console.error(e);
    }
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.waiveMediaConsent) {
    await updateDoc(col.orders, id, {
      media_consent_at: new Date().toISOString(),
    });
    await createDoc(col.orderEvents, {
      order_id: id,
      type: 'media_consent_waived',
      note: parsed.data.note ?? 'Admin waived media consent',
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.markBalancePaidInPerson) {
    if (!parsed.data.note?.trim()) {
      return NextResponse.json({ error: 'Note required' }, { status: 400 });
    }
    await updateDoc(col.orders, id, { status: 'balance_paid' });
    await createDoc(col.orderEvents, {
      order_id: id,
      type: 'balance_paid_in_person',
      note: parsed.data.note,
    });
    return NextResponse.json({ ok: true });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.tracking_number !== undefined) {
    updates.tracking_number = parsed.data.tracking_number ?? '';
  }

  if (parsed.data.price_override_cents != null) {
    const settings = await getSettings();
    const metal = normalizeMetalId(order.metal);
    const designDoc = await getDoc(col.designs, String(order.design_id));
    const teeth = designDoc
      ? (JSON.parse(String(designDoc.teeth_json ?? '{}')) as TeethMap)
      : {};
    const estimate = calculateEstimate({
      arch: (designDoc?.arch as ArchChoice) ?? 'top',
      teeth,
      fulfillment: order.fulfillment as FulfillmentChoice,
      tier: order.tier as 'founding' | 'friend' | 'standard',
      appliedSpot: settings.applied_spot,
      metal,
      priceOverrideCents: parsed.data.price_override_cents,
    });
    if (!estimate.priced || estimate.totalCents == null) {
      return NextResponse.json({ error: 'Could not apply manual price' }, { status: 400 });
    }
    updates.price_override_cents = parsed.data.price_override_cents;
    updates.total_cents = estimate.totalCents;
    updates.deposit_cents = estimate.depositCents ?? 0;
    updates.balance_cents = estimate.balanceCents ?? 0;
    updates.price_snapshot_json = JSON.stringify(estimate.priceSnapshot);
  }

  if (Object.keys(updates).length) await updateDoc(col.orders, id, updates);

  if (parsed.data.status) {
    await createDoc(col.orderEvents, {
      order_id: id,
      type: parsed.data.status,
      note: parsed.data.note ?? '',
    });
  } else if (parsed.data.price_override_cents != null) {
    await createDoc(col.orderEvents, {
      order_id: id,
      type: 'price_override',
      note:
        parsed.data.note ??
        `Manual price set to $${(parsed.data.price_override_cents / 100).toFixed(0)}`,
    });
  }

  return NextResponse.json({ ok: true });
}

const photoReviewSchema = z.object({
  photoId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
  note: z.string().max(2000).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = photoReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const order = await getDoc(col.orders, id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await updateDoc(col.moldPhotos, parsed.data.photoId, {
    status: parsed.data.status,
    reviewer_note: parsed.data.note ?? '',
  });

  if (parsed.data.status === 'approved') {
    await updateDoc(col.orders, id, { status: 'mold_photos_approved' });
    await createDoc(col.orderEvents, {
      order_id: id,
      type: 'mold_photos_approved',
      note: parsed.data.note ?? '',
    });
  }

  try {
    await sendMoldReviewResult({
      to: String(order.email),
      name: String(order.name),
      approved: parsed.data.status === 'approved',
      note: parsed.data.note,
      accessToken: String(order.access_token),
    });
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ ok: true });
}
