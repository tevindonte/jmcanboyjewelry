import { NextResponse } from 'next/server';
import { findOne, getDoc, listDocs, col, Query } from '@/lib/db';

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
  });
}
