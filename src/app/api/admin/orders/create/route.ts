import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { adminCreateOrderSchema } from '@/lib/validations';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateEstimate } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';
import { generateAccessToken } from '@/lib/referral';
import { siteConfig } from '@/lib/site.config';
import { clientIp } from '@/lib/rate-limit';

/**
 * Admin-created friend / in-person orders.
 * Friend tier never consumes founding slots.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = adminCreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid order', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if ((data.markDepositPaid || data.markBalancePaid) && !data.note.trim()) {
    return NextResponse.json({ error: 'Note required when marking paid' }, { status: 400 });
  }

  if (data.tier === 'friend' && data.priceOverrideCents == null) {
    return NextResponse.json(
      { error: 'Friend orders need a manual price (price_override_cents)' },
      { status: 400 },
    );
  }

  // Public founding/standard via admin: founding only if slots remain — but friend never takes a slot
  const settings = await getSettings();
  let tier = data.tier;
  if (tier === 'founding') {
    const { getFoundingSlotsRemaining } = await import('@/lib/settings');
    const { remaining } = await getFoundingSlotsRemaining();
    if (remaining <= 0) tier = 'standard';
  }

  const estimate = calculateEstimate({
    arch: data.arch,
    teeth: data.teeth,
    fulfillment: data.fulfillment,
    tier,
    appliedSpot: settings.applied_spot,
    priceOverrideCents: data.priceOverrideCents,
  });

  if (!estimate.priced || estimate.totalCents == null) {
    return NextResponse.json({ error: 'Could not price order' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: design, error: designError } = await supabase
    .from('designs')
    .insert({
      email: data.email.toLowerCase(),
      arch: data.arch,
      teeth: data.teeth,
      estimate_cents: estimate.totalCents,
    })
    .select('id')
    .single();

  if (designError || !design) {
    return NextResponse.json({ error: 'Could not save design' }, { status: 500 });
  }

  let status: string = 'pending_deposit';
  if (data.markBalancePaid) status = 'balance_paid';
  else if (data.markDepositPaid) status = 'deposit_paid';

  const accessToken = generateAccessToken();
  const ip = clientIp(request.headers);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      access_token: accessToken,
      design_id: design.id,
      email: data.email.toLowerCase(),
      name: data.name,
      phone: data.phone ?? null,
      fulfillment: data.fulfillment,
      status,
      tier,
      price_override_cents: data.priceOverrideCents ?? null,
      total_cents: estimate.totalCents,
      deposit_cents: estimate.depositCents ?? 0,
      balance_cents: estimate.balanceCents ?? 0,
      price_snapshot: estimate.priceSnapshot,
      terms_version: siteConfig.termsVersion,
      terms_accepted_at: new Date().toISOString(),
      terms_accepted_ip: ip,
      shipping_address: data.shippingAddress ?? null,
    })
    .select('id, access_token')
    .single();

  if (orderError || !order) {
    console.error(orderError);
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 });
  }

  await supabase.from('order_events').insert({
    order_id: order.id,
    type: 'admin_created',
    note: data.note,
  });

  if (data.markDepositPaid) {
    await supabase.from('order_events').insert({
      order_id: order.id,
      type: 'deposit_paid',
      note: `In person / admin: ${data.note}`,
    });
  }
  if (data.markBalancePaid) {
    await supabase.from('order_events').insert({
      order_id: order.id,
      type: 'balance_paid_in_person',
      note: data.note,
    });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return NextResponse.json({
    id: order.id,
    accessToken: order.access_token,
    orderUrl: `${base}/order/${order.access_token}`,
    tier,
    totalCents: estimate.totalCents,
  });
}
