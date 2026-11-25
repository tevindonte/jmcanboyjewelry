import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { sendOrderConfirmation } from '@/lib/email';
import { createDoc, getDoc, updateDoc, col } from '@/lib/db';
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

  const existing = await getDoc(col.stripeEvents, event.id);
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await createDoc(col.stripeEvents, { type: event.type }, event.id);
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    const payType = session.metadata?.type;
    if (!orderId) return NextResponse.json({ received: true });

    const order = await getDoc(col.orders, orderId);
    if (!order) return NextResponse.json({ received: true });

    if (payType === 'deposit') {
      if (order.status !== 'pending_deposit') {
        return NextResponse.json({ received: true });
      }
      await updateDoc(col.orders, orderId, {
        status: 'deposit_paid',
        stripe_deposit_session_id: session.id,
      });
      await createDoc(col.orderEvents, {
        order_id: orderId,
        type: 'deposit_paid',
        note: `Stripe session ${session.id}`,
      });
      try {
        await sendOrderConfirmation({
          to: String(order.email),
          name: String(order.name),
          accessToken: String(order.access_token),
          depositCents: Number(order.deposit_cents),
        });
      } catch (e) {
        console.error('confirmation email', e);
      }
      try {
        const {
          notifyAdmin,
          adminOrderPath,
          fulfillmentLabel,
          formatCentsPlain,
        } = await import('@/lib/admin-notify');
        const snap = order.price_snapshot_json
          ? (JSON.parse(String(order.price_snapshot_json)) as {
              kitFeeUsd?: number | null;
            })
          : null;
        const kitFee =
          order.fulfillment === 'kit_mail' && Number(snap?.kitFeeUsd ?? 0) > 0
            ? 'yes'
            : 'no';
        await notifyAdmin({
          eventType: 'deposit_paid',
          entityId: orderId,
          subject: `Deposit paid · ${order.name}`,
          summaryLines: [
            `Customer: ${order.name} <${order.email}>`,
            `Amount: ${formatCentsPlain(Number(order.deposit_cents))}`,
            `Fulfillment: ${fulfillmentLabel(String(order.fulfillment))}`,
            `Kit fee: ${kitFee}`,
          ],
          linkPath: adminOrderPath(orderId),
        });
      } catch (e) {
        console.error('deposit admin notify', e);
      }
    }

    if (payType === 'balance') {
      if (order.status === 'balance_paid' || order.status === 'shipped') {
        return NextResponse.json({ received: true });
      }
      await updateDoc(col.orders, orderId, {
        status: 'balance_paid',
        stripe_balance_session_id: session.id,
      });
      await createDoc(col.orderEvents, {
        order_id: orderId,
        type: 'balance_paid',
        note: `Stripe session ${session.id}`,
      });
      try {
        const {
          notifyAdmin,
          adminOrderPath,
          formatCentsPlain,
        } = await import('@/lib/admin-notify');
        await notifyAdmin({
          eventType: 'balance_paid',
          entityId: orderId,
          subject: `Balance paid · ${order.name}`,
          summaryLines: [
            `Customer: ${order.name} <${order.email}>`,
            `Balance: ${formatCentsPlain(Number(order.balance_cents))}`,
          ],
          linkPath: adminOrderPath(orderId),
        });
      } catch (e) {
        console.error('balance admin notify', e);
      }
    }
  }

  return NextResponse.json({ received: true });
}
