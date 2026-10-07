import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { sendBalanceLink } from '@/lib/email';

const schema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', parsed.data.orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (order.balance_cents <= 0) {
    return NextResponse.json({ error: 'No balance due' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    allowed_payment_method_types: ['card', 'cashapp'],
    customer_email: order.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: order.balance_cents,
          product_data: {
            name: 'JMCANBOY Jewelry — balance',
            description: 'Remaining balance for custom sterling grill',
          },
        },
      },
    ],
    metadata: {
      order_id: order.id,
      type: 'balance',
    },
    success_url: `${base}/order/${order.access_token}?balance=1`,
    cancel_url: `${base}/order/${order.access_token}`,
  });

  await supabase
    .from('orders')
    .update({ stripe_balance_session_id: session.id })
    .eq('id', order.id);

  await supabase.from('order_events').insert({
    order_id: order.id,
    type: 'balance_link_sent',
    note: session.id,
  });

  if (session.url) {
    await sendBalanceLink({
      to: order.email,
      name: order.name,
      checkoutUrl: session.url,
      accessToken: order.access_token,
    });
  }

  return NextResponse.json({ url: session.url });
}
