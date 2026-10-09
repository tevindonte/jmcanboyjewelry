import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { adminCreateOrderSchema } from '@/lib/validations';
import { calculateEstimate } from '@/lib/pricing';
import { normalizeMetalId } from '@/lib/pricing.config';
import { getSettings, getFoundingSlotsRemaining } from '@/lib/settings';
import { generateAccessToken } from '@/lib/referral';
import { siteConfig } from '@/lib/site.config';
import { clientIp } from '@/lib/rate-limit';
import { createDoc, col } from '@/lib/db';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = adminCreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
  }

  const data = parsed.data;
  const metal = normalizeMetalId(data.metal);
  if ((data.markDepositPaid || data.markBalancePaid) && !data.note.trim()) {
    return NextResponse.json({ error: 'Note required when marking paid' }, { status: 400 });
  }
  if (data.tier === 'friend' && data.priceOverrideCents == null) {
    return NextResponse.json(
      { error: 'Friend orders need a manual price (price_override_cents)' },
      { status: 400 },
    );
  }
  if (metal === 'gold' && data.priceOverrideCents == null) {
    return NextResponse.json(
      { error: 'Solid gold orders need a manual quote (price_override_cents)' },
      { status: 400 },
    );
  }

  const settings = await getSettings();
  let tier = data.tier;
  if (tier === 'founding') {
    const { remaining } = await getFoundingSlotsRemaining();
    if (remaining <= 0) tier = 'standard';
  }

  const estimate = calculateEstimate({
    arch: data.arch,
    teeth: data.teeth,
    fulfillment: data.fulfillment,
    tier,
    appliedSpot: settings.applied_spot,
    metal,
    priceOverrideCents: data.priceOverrideCents,
  });

  if (!estimate.priced || estimate.totalCents == null) {
    return NextResponse.json({ error: 'Could not price order' }, { status: 400 });
  }

  try {
    const design = await createDoc(col.designs, {
      email: data.email.toLowerCase(),
      arch: data.arch,
      teeth_json: JSON.stringify(data.teeth),
      metal,
      estimate_cents: estimate.totalCents,
    });

    let status = 'pending_deposit';
    if (data.markBalancePaid) status = 'balance_paid';
    else if (data.markDepositPaid) status = 'deposit_paid';

    const accessToken = generateAccessToken();
    const ip = clientIp(request.headers);

    const order = await createDoc(col.orders, {
      access_token: accessToken,
      design_id: design.$id,
      email: data.email.toLowerCase(),
      name: data.name,
      phone: data.phone ?? '',
      fulfillment: data.fulfillment,
      status,
      tier,
      metal,
      price_override_cents: data.priceOverrideCents ?? 0,
      media_consent_at: '',
      total_cents: estimate.totalCents,
      deposit_cents: estimate.depositCents ?? 0,
      balance_cents: estimate.balanceCents ?? 0,
      stripe_deposit_session_id: '',
      stripe_balance_session_id: '',
      price_snapshot_json: JSON.stringify(estimate.priceSnapshot),
      terms_version: siteConfig.termsVersion,
      terms_accepted_at: new Date().toISOString(),
      terms_accepted_ip: ip,
      shipping_address_json: data.shippingAddress
        ? JSON.stringify(data.shippingAddress)
        : '',
      tracking_number: '',
    });

    await createDoc(col.orderEvents, {
      order_id: order.$id,
      type: 'admin_created',
      note: data.note,
    });

    if (data.markDepositPaid) {
      await createDoc(col.orderEvents, {
        order_id: order.$id,
        type: 'deposit_paid',
        note: `In person / admin: ${data.note}`,
      });
    }
    if (data.markBalancePaid) {
      await createDoc(col.orderEvents, {
        order_id: order.$id,
        type: 'balance_paid_in_person',
        note: data.note,
      });
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    return NextResponse.json({
      id: order.$id,
      accessToken,
      orderUrl: `${base}/order/${accessToken}`,
      tier,
      totalCents: estimate.totalCents,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 });
  }
}
