import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderConfirmation } from '@/lib/email';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('stripe signature', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Idempotency: skip if event already processed
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await supabase.from('stripe_webhook_events').insert({
    id: event.id,
    type: event.type,
  });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    const payType = session.metadata?.type;

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ received: true });
    }

    if (payType === 'deposit') {
      if (order.status !== 'pending_deposit') {
        // Already advanced — idempotent
        return NextResponse.json({ received: true });
      }

      await supabase
        .from('orders')
        .update({
          status: 'deposit_paid',
          stripe_deposit_session_id: session.id,
        })
        .eq('id', orderId);

      await supabase.from('order_events').insert({
        order_id: orderId,
        type: 'deposit_paid',
        note: `Stripe session ${session.id}`,
      });

      try {
        await sendOrderConfirmation({
          to: order.email,
          name: order.name,
          accessToken: order.access_token,
          depositCents: order.deposit_cents,
        });
      } catch (e) {
        console.error('confirmation email', e);
      }
    }

    if (payType === 'balance') {
      if (order.status === 'balance_paid' || order.status === 'shipped') {
        return NextResponse.json({ received: true });
      }

      await supabase
        .from('orders')
        .update({
          status: 'balance_paid',
          stripe_balance_session_id: session.id,
        })
        .eq('id', orderId);

      await supabase.from('order_events').insert({
        order_id: orderId,
        type: 'balance_paid',
        note: `Stripe session ${session.id}`,
      });
    }
  }

  return NextResponse.json({ received: true });
}
