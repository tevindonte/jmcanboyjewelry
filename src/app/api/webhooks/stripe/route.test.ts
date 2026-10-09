import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

const WEBHOOK_SECRET = 'whsec_test_local_secret_for_unit_tests';

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  sendOrderConfirmation: vi.fn(),
  col: {
    stripeEvents: 'stripe_webhook_events',
    orders: 'orders',
    orderEvents: 'order_events',
  },
}));

vi.mock('@/lib/db', () => ({
  getDoc: mocks.getDoc,
  createDoc: mocks.createDoc,
  updateDoc: mocks.updateDoc,
  col: mocks.col,
}));

vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: mocks.sendOrderConfirmation,
}));

vi.mock('@/lib/stripe', () => {
  const stripe = new Stripe('sk_test_unit_placeholder');
  return { getStripe: () => stripe };
});

import { POST } from './route';

function signedRequest(payload: object | string, secret = WEBHOOK_SECRET, badSig = false) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const stripe = new Stripe('sk_test_unit_placeholder');
  const header = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
  });
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'stripe-signature': badSig ? 't=1,v1=deadbeef' : header,
      'content-type': 'application/json',
    },
    body,
  });
}

function checkoutCompletedEvent(opts: {
  eventId: string;
  orderId: string;
  sessionId?: string;
  type?: 'deposit' | 'balance';
  amountTotal?: number;
}) {
  return {
    id: opts.eventId,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: opts.sessionId ?? 'cs_test_abc',
        object: 'checkout.session',
        amount_total: opts.amountTotal ?? 12750,
        metadata: {
          order_id: opts.orderId,
          type: opts.type ?? 'deposit',
        },
        payment_status: 'paid',
      },
    },
  };
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    mocks.createDoc.mockResolvedValue({ $id: 'evt_row' });
    mocks.updateDoc.mockResolvedValue({ $id: 'ord_1' });
    mocks.sendOrderConfirmation.mockResolvedValue(undefined);
  });

  it('rejects a missing signature', async () => {
    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: '{}',
      }),
    );
    expect(res.status).toBe(500);
    expect(mocks.createDoc).not.toHaveBeenCalled();
  });

  it('rejects a bad signature', async () => {
    const res = await POST(
      signedRequest(
        checkoutCompletedEvent({ eventId: 'evt_bad', orderId: 'ord_1' }),
        WEBHOOK_SECRET,
        true,
      ),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid signature');
    expect(mocks.updateDoc).not.toHaveBeenCalled();
  });

  it('checkout.session.completed marks the order deposit_paid exactly once', async () => {
    mocks.getDoc.mockImplementation(async (collection: string, id: string) => {
      if (collection === mocks.col.stripeEvents) return null;
      if (collection === mocks.col.orders) {
        return {
          $id: id,
          status: 'pending_deposit',
          email: 'buyer@example.com',
          name: 'Buyer',
          access_token: 'tok_abc',
          deposit_cents: 12750,
          tier: 'founding',
        };
      }
      return null;
    });

    const event = checkoutCompletedEvent({
      eventId: 'evt_pay_1',
      orderId: 'ord_founding_1',
      sessionId: 'cs_test_deposit_1',
    });
    const res = await POST(signedRequest(event));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);

    expect(mocks.createDoc).toHaveBeenCalledWith(
      mocks.col.stripeEvents,
      { type: 'checkout.session.completed' },
      'evt_pay_1',
    );
    expect(mocks.updateDoc).toHaveBeenCalledWith(mocks.col.orders, 'ord_founding_1', {
      status: 'deposit_paid',
      stripe_deposit_session_id: 'cs_test_deposit_1',
    });
    expect(mocks.createDoc).toHaveBeenCalledWith(
      mocks.col.orderEvents,
      expect.objectContaining({
        order_id: 'ord_founding_1',
        type: 'deposit_paid',
      }),
    );
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it('replaying the same event ID is a no-op (no second update or email)', async () => {
    mocks.getDoc.mockImplementation(async (collection: string) => {
      if (collection === mocks.col.stripeEvents) {
        return { $id: 'evt_replay', type: 'checkout.session.completed' };
      }
      return null;
    });

    const event = checkoutCompletedEvent({
      eventId: 'evt_replay',
      orderId: 'ord_1',
    });
    const res = await POST(signedRequest(event));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(mocks.updateDoc).not.toHaveBeenCalled();
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(mocks.createDoc).not.toHaveBeenCalled();
  });

  it('second delivery of same event via create race still skips order mutation', async () => {
    mocks.getDoc.mockImplementation(async (collection: string, id: string) => {
      if (collection === mocks.col.stripeEvents) return null;
      if (collection === mocks.col.orders) {
        return {
          $id: id,
          status: 'pending_deposit',
          email: 'a@b.com',
          name: 'A',
          access_token: 't',
          deposit_cents: 1000,
        };
      }
      return null;
    });
    mocks.createDoc.mockRejectedValueOnce(new Error('unique constraint'));

    const res = await POST(
      signedRequest(
        checkoutCompletedEvent({ eventId: 'evt_race', orderId: 'ord_1' }),
      ),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).duplicate).toBe(true);
    expect(mocks.updateDoc).not.toHaveBeenCalled();
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('already-paid deposit does not re-email or rewrite status', async () => {
    mocks.getDoc.mockImplementation(async (collection: string, id: string) => {
      if (collection === mocks.col.stripeEvents) return null;
      if (collection === mocks.col.orders) {
        return {
          $id: id,
          status: 'deposit_paid',
          email: 'a@b.com',
          name: 'A',
          access_token: 't',
          deposit_cents: 1000,
        };
      }
      return null;
    });

    const res = await POST(
      signedRequest(
        checkoutCompletedEvent({ eventId: 'evt_already', orderId: 'ord_1' }),
      ),
    );
    expect(res.status).toBe(200);
    expect(mocks.updateDoc).not.toHaveBeenCalled();
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('payment failure / expired session leaves order unpaid', async () => {
    mocks.getDoc.mockResolvedValue(null);

    for (const type of [
      'checkout.session.expired',
      'payment_intent.payment_failed',
    ] as const) {
      vi.clearAllMocks();
      mocks.createDoc.mockResolvedValue({ $id: 'x' });
      mocks.getDoc.mockImplementation(async (collection: string) => {
        if (collection === mocks.col.stripeEvents) return null;
        return {
          $id: 'ord_unpaid',
          status: 'pending_deposit',
          email: 'a@b.com',
          name: 'A',
          access_token: 't',
          deposit_cents: 1000,
          tier: 'founding',
        };
      });

      const payload = {
        id: `evt_${type}`,
        object: 'event',
        type,
        data: {
          object: {
            id: 'cs_or_pi_fail',
            metadata: { order_id: 'ord_unpaid', type: 'deposit' },
          },
        },
      };
      const res = await POST(signedRequest(payload));
      expect(res.status).toBe(200);
      expect(mocks.updateDoc).not.toHaveBeenCalled();
      expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
      // event recorded for idempotency only; founding slot stays free while pending_deposit
      expect(mocks.createDoc).toHaveBeenCalledWith(
        mocks.col.stripeEvents,
        { type },
        `evt_${type}`,
      );
    }
  });
});
