import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { sendDepositPaymentLink } from '@/lib/email';
import { getDoc, updateDoc, createDoc, col } from '@/lib/db';

/** Admin: create a Stripe deposit Checkout URL and email it (friends / private invites). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const order = await getDoc(col.orders, id);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (order.status !== 'pending_deposit') {
    return NextResponse.json(
      { error: 'Payment link only works for orders still pending deposit.' },
      { status: 400 },
    );
  }

  const depositCents = Number(order.deposit_cents);
  if (!Number.isFinite(depositCents) || depositCents <= 0) {
    return NextResponse.json(
      { error: 'Order has no deposit amount. Set a manual price first.' },
      { status: 400 },
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const accessToken = String(order.access_token);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    allowed_payment_method_types: ['card', 'cashapp'],
    customer_email: String(order.email).toLowerCase(),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: depositCents,
          product_data: {
            name: 'JMCANBOY Jewelry deposit',
            description: 'Deposit for custom sterling grill',
          },
        },
      },
    ],
    metadata: { order_id: id, type: 'deposit' },
    success_url: `${base}/order/${accessToken}?paid=1`,
    cancel_url: `${base}/order/${accessToken}?cancelled=1`,
  });

  await updateDoc(col.orders, id, {
    stripe_deposit_session_id: session.id,
  });
  await createDoc(col.orderEvents, {
    order_id: id,
    type: 'deposit_link_sent',
    note: `Stripe session ${session.id}`,
  });

  try {
    await sendDepositPaymentLink({
      to: String(order.email),
      name: String(order.name),
      checkoutUrl: session.url!,
      accessToken,
      depositCents,
    });
  } catch (e) {
    console.error('deposit link email', e);
    return NextResponse.json(
      {
        error: 'Checkout URL created but email failed. Copy the URL from the response.',
        url: session.url,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, url: session.url });
}
