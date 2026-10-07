import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { orderStatusSchema } from '@/lib/validations';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const supabase = createAdminClient();

  let query = supabase
    .from('orders')
    .select(
      'id, email, name, status, tier, total_cents, deposit_cents, balance_cents, fulfillment, created_at, tracking_number',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (status) {
    const parsed = orderStatusSchema.safeParse(status);
    if (parsed.success) query = query.eq('status', parsed.data);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ orders: data });
}
