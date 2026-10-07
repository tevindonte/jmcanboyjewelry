import { NextResponse } from 'next/server';
import { depositCheckoutSchema } from '@/lib/validations';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateEstimate, type TeethMap } from '@/lib/pricing';
import { getSettings, resolvePublicTier } from '@/lib/settings';
import { getStripe } from '@/lib/stripe';
import { generateAccessToken } from '@/lib/referral';
import { siteConfig } from '@/lib/site.config';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import type { ArchChoice } from '@/lib/pricing.config';

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`deposit:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const settings = await getSettings();
  if (settings.site_mode !== 'preorder') {
    return NextResponse.json(
      { error: 'Pre-orders are not open. Join the waitlist instead.' },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = depositCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid checkout data' }, { status: 400 });
  }
  if (parsed.data.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const tier = await resolvePublicTier();
  if (tier === 'founding' && !parsed.data.mediaConsent) {
    return NextResponse.json(
      {
        error:
          'Founding pricing requires consent to film/post your impression, fit, and results.',
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: design, error: designError } = await supabase
    .from('designs')
    .select('*')
    .eq('id', parsed.data.designId)
    .single();

  if (designError || !design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  // Server recomputes — never trust client totals
  const estimate = calculateEstimate({
    arch: design.arch as ArchChoice,
    teeth: design.teeth as TeethMap,
    fulfillment: parsed.data.fulfillment,
    tier,
    appliedSpot: settings.applied_spot,
  });

  if (!estimate.priced || estimate.depositCents == null || estimate.totalCents == null) {
    return NextResponse.json(
      { error: 'Pricing is not configured yet. Price on request.' },
      { status: 400 },
    );
  }

  const accessToken = generateAccessToken();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      access_token: accessToken,
      design_id: design.id,
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      fulfillment: parsed.data.fulfillment,
      status: 'pending_deposit',
      tier,
      media_consent_at:
        tier === 'founding' && parsed.data.mediaConsent
          ? new Date().toISOString()
          : null,
      total_cents: estimate.totalCents,
      deposit_cents: estimate.depositCents,
      balance_cents: estimate.balanceCents ?? 0,
      price_snapshot: estimate.priceSnapshot,
      terms_version: siteConfig.termsVersion,
      terms_accepted_at: new Date().toISOString(),
      terms_accepted_ip: ip,
      shipping_address:
        parsed.data.fulfillment === 'kit_mail' ? parsed.data.shippingAddress ?? null : null,
    })
    .select('id, access_token')
    .single();

  if (orderError || !order) {
    console.error(orderError);
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 });
  }

  await supabase.from('order_events').insert({
    order_id: order.id,
    type: 'checkout_started',
    note: `Deposit checkout · tier=${tier}`,
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    allowed_payment_method_types: ['card', 'cashapp'],
    customer_email: parsed.data.email.toLowerCase(),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: estimate.depositCents,
          product_data: {
            name: 'JMCANBOY Jewelry — deposit',
            description:
              tier === 'founding'
                ? 'Founding client deposit for custom sterling grill'
                : 'Deposit for custom sterling grill',
          },
        },
      },
    ],
    metadata: {
      order_id: order.id,
      type: 'deposit',
    },
    success_url: `${base}/order/${order.access_token}?paid=1`,
    cancel_url: `${base}/build?cancelled=1`,
  });

  await supabase
    .from('orders')
    .update({ stripe_deposit_session_id: session.id })
    .eq('id', order.id);

  return NextResponse.json({ url: session.url, orderId: order.id });
}
