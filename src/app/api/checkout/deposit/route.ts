import { NextResponse } from 'next/server';
import { depositCheckoutSchema } from '@/lib/validations';
import { calculateEstimate, type TeethMap } from '@/lib/pricing';
import { getSettings, resolvePublicTier } from '@/lib/settings';
import { getStripe } from '@/lib/stripe';
import { generateAccessToken } from '@/lib/referral';
import { siteConfig } from '@/lib/site.config';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { normalizeMetalId, type ArchChoice } from '@/lib/pricing.config';
import { createDoc, getDoc, updateDoc, col } from '@/lib/db';

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
    const issue = parsed.error.issues[0];
    const path = issue?.path?.join('.') ?? '';
    let error = 'Check the form and try again.';
    if (path.includes('email')) error = 'Enter a valid email for your receipt and order link.';
    else if (path.includes('name')) error = 'Enter your name so we can email your order link.';
    else if (path.includes('designId')) error = 'Design missing. Go back to the builder and save again.';
    else if (path.includes('fulfillment')) error = 'Choose how we get your fit (kit, local, or scan).';
    else if (path.includes('termsAccepted')) error = 'Accept the terms to continue.';
    else if (path.includes('shippingAddress')) error = 'Shipping is collected after payment on your order link.';
    else if (issue?.message) error = issue.message;
    return NextResponse.json({ error }, { status: 400 });
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

  const design = await getDoc(col.designs, parsed.data.designId);
  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  const metal = normalizeMetalId(design.metal);
  if (metal === 'gold') {
    return NextResponse.json(
      {
        error:
          'Solid gold is quoted per order and cannot check out online. Save your design and join the waitlist.',
      },
      { status: 400 },
    );
  }

  const teeth = JSON.parse(String(design.teeth_json ?? '{}')) as TeethMap;
  const estimate = calculateEstimate({
    arch: design.arch as ArchChoice,
    teeth,
    fulfillment: parsed.data.fulfillment,
    tier,
    appliedSpot: settings.applied_spot,
    metal,
  });

  if (estimate.selectedToothCount === 0) {
    return NextResponse.json(
      { error: 'Pick at least one tooth to continue. Go back to the builder.' },
      { status: 400 },
    );
  }

  if (!estimate.priced || estimate.depositCents == null || estimate.totalCents == null) {
    return NextResponse.json(
      {
        error:
          metal === 'gold'
            ? 'Solid gold is quoted per order. Join the waitlist and we will email a price.'
            : 'Pricing is not available for this design yet. Email us or join the waitlist.',
      },
      { status: 400 },
    );
  }

  const accessToken = generateAccessToken();

  try {
    const order = await createDoc(col.orders, {
      access_token: accessToken,
      design_id: design.$id,
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      phone: parsed.data.phone ?? '',
      fulfillment: parsed.data.fulfillment,
      status: 'pending_deposit',
      tier,
      metal,
      price_override_cents: 0,
      media_consent_at:
        tier === 'founding' && parsed.data.mediaConsent
          ? new Date().toISOString()
          : '',
      total_cents: estimate.totalCents,
      deposit_cents: estimate.depositCents,
      balance_cents: estimate.balanceCents ?? 0,
      stripe_deposit_session_id: '',
      stripe_balance_session_id: '',
      price_snapshot_json: JSON.stringify(estimate.priceSnapshot),
      terms_version: siteConfig.termsVersion,
      terms_accepted_at: new Date().toISOString(),
      terms_accepted_ip: ip,
      shipping_address_json:
        parsed.data.fulfillment === 'kit_mail'
          ? JSON.stringify(parsed.data.shippingAddress ?? null)
          : '',
      tracking_number: '',
      scan_file_id: '',
      scan_filename: '',
      scan_size_bytes: 0,
      scan_uploaded_at: '',
      scan_status: '',
    });

    await createDoc(col.orderEvents, {
      order_id: order.$id,
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
              name: 'JMCANBOY Jewelry deposit',
              description:
                tier === 'founding'
                  ? 'Founding client deposit for custom sterling grill'
                  : 'Deposit for custom sterling grill',
            },
          },
        },
      ],
      metadata: { order_id: order.$id, type: 'deposit' },
      success_url: `${base}/order/${accessToken}?paid=1`,
      cancel_url: `${base}/build?cancelled=1`,
    });

    await updateDoc(col.orders, order.$id, {
      stripe_deposit_session_id: session.id,
    });

    return NextResponse.json({ url: session.url, orderId: order.$id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 });
  }
}
