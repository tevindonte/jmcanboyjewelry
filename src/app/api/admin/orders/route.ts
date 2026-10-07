import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listDocs, col, Query } from '@/lib/db';
import { orderStatusSchema } from '@/lib/validations';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const queries = [Query.orderDesc('$createdAt'), Query.limit(200)];

  if (status) {
    const parsed = orderStatusSchema.safeParse(status);
    if (parsed.success) queries.unshift(Query.equal('status', parsed.data));
  }

  try {
    const { documents } = await listDocs(col.orders, queries);
    return NextResponse.json({
      orders: documents.map((o) => ({
        id: o.$id,
        email: o.email,
        name: o.name,
        status: o.status,
        tier: o.tier,
        total_cents: o.total_cents,
        deposit_cents: o.deposit_cents,
        balance_cents: o.balance_cents,
        fulfillment: o.fulfillment,
        created_at: o.$createdAt,
        tracking_number: o.tracking_number || null,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}
