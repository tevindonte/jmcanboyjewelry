import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listDocs, col, Query } from '@/lib/db';

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { documents: orders } = await listDocs(col.orders, [
    Query.orderDesc('$createdAt'),
    Query.limit(5000),
  ]);

  const headers = [
    'id',
    'email',
    'name',
    'phone',
    'status',
    'fulfillment',
    'tier',
    'total_cents',
    'deposit_cents',
    'balance_cents',
    'tracking_number',
    'created_at',
  ];

  const lines = [headers.join(',')];
  for (const o of orders) {
    const row = {
      id: o.$id,
      email: o.email,
      name: o.name,
      phone: o.phone,
      status: o.status,
      fulfillment: o.fulfillment,
      tier: o.tier,
      total_cents: o.total_cents,
      deposit_cents: o.deposit_cents,
      balance_cents: o.balance_cents,
      tracking_number: o.tracking_number,
      created_at: o.$createdAt,
    };
    lines.push(headers.map((h) => csvEscape((row as Record<string, unknown>)[h])).join(','));
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="jmcanboy-orders.csv"',
    },
  });
}
