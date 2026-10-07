import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const supabase = createAdminClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  const headers = [
    'id',
    'email',
    'name',
    'phone',
    'status',
    'fulfillment',
    'founding',
    'total_cents',
    'deposit_cents',
    'balance_cents',
    'tracking_number',
    'created_at',
  ];

  const lines = [headers.join(',')];
  for (const o of orders ?? []) {
    lines.push(headers.map((h) => csvEscape((o as Record<string, unknown>)[h])).join(','));
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="jmcanboy-orders.csv"',
    },
  });
}
