import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { sendBalanceLink } from '@/lib/email';
import { getDoc, updateDoc, createDoc, col } from '@/lib/db';

const schema = z.object({ orderId: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const order = await getDoc(col.orders, parsed.data.orderId);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const balance = Number(order.balance_cents);
  if (balance <= 0) {
    return NextResponse.json({ error: 'No balance due' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    allowed_payment_method_types: ['card', 'cashapp'],
    customer_email: String(order.email),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: balance,
          product_data: {
            name: 'JMCANBOY Jewelry balance',
            description: 'Remaining balance for custom sterling grill',
          },
        },
      },
    ],
    metadata: { order_id: order.$id, type: 'balance' },
    success_url: `${base}/order/${order.access_token}?balance=1`,
    cancel_url: `${base}/order/${order.access_token}`,
  });

  await updateDoc(col.orders, order.$id, {
    stripe_balance_session_id: session.id,
  });
  await createDoc(col.orderEvents, {
    order_id: order.$id,
    type: 'balance_link_sent',
    note: session.id,
  });

  if (session.url) {
    await sendBalanceLink({
      to: String(order.email),
      name: String(order.name),
      checkoutUrl: session.url,
      accessToken: String(order.access_token),
    });
  }

  return NextResponse.json({ url: session.url });
}
