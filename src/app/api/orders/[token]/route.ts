import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, access_token, email, name, fulfillment, status, tier, total_cents, deposit_cents, balance_cents, tracking_number, created_at, design_id',
    )
    .eq('access_token', token)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: design } = await supabase
    .from('designs')
    .select('id, arch, teeth, estimate_cents')
    .eq('id', order.design_id)
    .single();

  const { data: events } = await supabase
    .from('order_events')
    .select('type, note, created_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  const { data: photos } = await supabase
    .from('mold_photos')
    .select('id, status, reviewer_note, created_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ order, design, events: events ?? [], photos: photos ?? [] });
}
