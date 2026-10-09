import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findOne, getDoc, listDocs, updateDoc, createDoc, col, Query } from '@/lib/db';
import { normalizeScanStatus } from '@/lib/scans';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const order = await findOne(col.orders, [Query.equal('access_token', token)]);
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const designDoc = await getDoc(col.designs, String(order.design_id));
  const design = designDoc
    ? {
        id: designDoc.$id,
        arch: designDoc.arch,
        teeth: JSON.parse(String(designDoc.teeth_json ?? '{}')),
        estimate_cents: designDoc.estimate_cents,
      }
    : null;

  const { documents: events } = await listDocs(col.orderEvents, [
    Query.equal('order_id', order.$id),
    Query.orderAsc('$createdAt'),
    Query.limit(200),
  ]);

  const { documents: photos } = await listDocs(col.moldPhotos, [
    Query.equal('order_id', order.$id),
    Query.orderAsc('$createdAt'),
    Query.limit(20),
  ]);

  const scanFileId = String(order.scan_file_id || '');
  const scan = scanFileId
    ? {
        file_id: scanFileId,
        filename: String(order.scan_filename || ''),
        size_bytes: Number(order.scan_size_bytes || 0),
        uploaded_at: String(order.scan_uploaded_at || ''),
        status: normalizeScanStatus(order.scan_status),
      }
    : null;

  return NextResponse.json({
    order: {
      id: order.$id,
      access_token: order.access_token,
      email: order.email,
      name: order.name,
      fulfillment: order.fulfillment,
      status: order.status,
      tier: order.tier,
      total_cents: order.total_cents,
      deposit_cents: order.deposit_cents,
      balance_cents: order.balance_cents,
      tracking_number: order.tracking_number || null,
      created_at: order.$createdAt,
      design_id: order.design_id,
      needs_shipping:
        order.fulfillment === 'kit_mail' &&
        !String(order.shipping_address_json || '').trim(),
    },
    design,
    events: events.map((e) => ({
      type: e.type,
      note: e.note || null,
      created_at: e.$createdAt,
    })),
    photos: photos.map((p) => ({
      id: p.$id,
      status: p.status,
      reviewer_note: p.reviewer_note || null,
      created_at: p.$createdAt,
    })),
    scan,
  });
}

const patchSchema = z.object({
  /** Customer mold-step path choice (does not change Stripe amounts). */
  fulfillment: z.enum(['kit_mail', 'local_impression', 'dentist_scan']).optional(),
  shippingAddress: z
    .object({
      line1: z.string().min(1).max(200),
      city: z.string().min(1).max(100),
      state: z.string().min(2).max(40),
      postal_code: z.string().min(3).max(20),
      country: z.string().length(2).default('US'),
    })
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`order-patch:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { token } = await params;
  const order = await findOne(col.orders, [Query.equal('access_token', token)]);
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (['shipped', 'cancelled', 'refunded'].includes(String(order.status))) {
    return NextResponse.json({ error: 'Order is closed' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check the form and try again.' }, { status: 400 });
  }

  if (parsed.data.shippingAddress) {
    await updateDoc(col.orders, order.$id, {
      shipping_address_json: JSON.stringify(parsed.data.shippingAddress),
      fulfillment: 'kit_mail',
    });
    await createDoc(col.orderEvents, {
      order_id: order.$id,
      type: 'shipping_address',
      note: 'Customer saved kit shipping address',
    });
    return NextResponse.json({ ok: true, shipping: true });
  }

  if (!parsed.data.fulfillment) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  await updateDoc(col.orders, order.$id, { fulfillment: parsed.data.fulfillment });
  await createDoc(col.orderEvents, {
    order_id: order.$id,
    type: 'fulfillment_path',
    note: `Customer chose ${parsed.data.fulfillment}`,
  });

  return NextResponse.json({ ok: true, fulfillment: parsed.data.fulfillment });
}
