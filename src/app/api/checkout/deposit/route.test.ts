import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  resolvePublicTier: vi.fn(),
  getDoc: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  rateLimit: vi.fn(() => ({ ok: true })),
  clientIp: vi.fn(() => '127.0.0.1'),
  generateAccessToken: vi.fn(() => 'access_test_token'),
  sessionsCreate: vi.fn(),
}));

vi.mock('@/lib/settings', () => ({
  getSettings: mocks.getSettings,
  resolvePublicTier: mocks.resolvePublicTier,
}));

vi.mock('@/lib/db', () => ({
  getDoc: mocks.getDoc,
  createDoc: mocks.createDoc,
  updateDoc: mocks.updateDoc,
  col: {
    designs: 'designs',
    orders: 'orders',
    orderEvents: 'order_events',
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  clientIp: mocks.clientIp,
}));

vi.mock('@/lib/referral', () => ({
  generateAccessToken: mocks.generateAccessToken,
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mocks.sessionsCreate } },
  }),
}));

import { POST } from './route';
import { calculateEstimate, type TeethMap } from '@/lib/pricing';
import { pricing } from '@/lib/pricing.config';

const top6Plain: TeethMap = {
  U2: 'plain',
  U3: 'plain',
  U4: 'plain',
  U5: 'plain',
  U6: 'plain',
  U7: 'plain',
};

describe('POST /api/checkout/deposit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockReturnValue({ ok: true });
    mocks.getSettings.mockResolvedValue({
      site_mode: 'preorder',
      site_public: true,
      founding_slots_total: 5,
      applied_spot: pricing.metal.spotReference,
    });
    mocks.resolvePublicTier.mockResolvedValue('standard');
    mocks.getDoc.mockResolvedValue({
      $id: '6ac9671d00283e8a9dfe',
      arch: 'top',
      teeth_json: JSON.stringify(top6Plain),
      metal: 'silver',
    });
    mocks.createDoc.mockImplementation(async (_c: string, data: Record<string, unknown>) => ({
      $id: 'ord_created_1',
      ...data,
    }));
    mocks.updateDoc.mockResolvedValue({ $id: 'ord_created_1' });
    mocks.sessionsCreate.mockResolvedValue({
      id: 'cs_test_mock',
      url: 'https://checkout.stripe.com/test',
    });
  });

  it('charges Stripe deposit equal to the price snapshot for dentist_scan (no kit fee)', async () => {
    const estimate = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'dentist_scan',
      tier: 'standard',
      appliedSpot: pricing.metal.spotReference,
      metal: 'silver',
    });

    const res = await POST(
      new Request('http://localhost/api/checkout/deposit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          designId: '6ac9671d00283e8a9dfe',
          name: 'Test Buyer',
          email: 'buyer@example.com',
          fulfillment: 'dentist_scan',
          termsAccepted: true,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
    const arg = mocks.sessionsCreate.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(estimate.depositCents);
    expect(estimate.kitFeeCents).toBe(0);
    expect(arg.metadata).toEqual({
      order_id: 'ord_created_1',
      type: 'deposit',
    });
  });

  it('does not call Stripe when site is not in preorder (order unpaid / no slot side effects)', async () => {
    mocks.getSettings.mockResolvedValue({
      site_mode: 'waitlist',
      site_public: false,
      founding_slots_total: 5,
      applied_spot: pricing.metal.spotReference,
    });
    const res = await POST(
      new Request('http://localhost/api/checkout/deposit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          designId: '6ac9671d00283e8a9dfe',
          name: 'Test Buyer',
          email: 'buyer@example.com',
          fulfillment: 'kit_mail',
          termsAccepted: true,
          shippingAddress: {
            line1: '1 Main',
            city: 'New Rochelle',
            state: 'NY',
            postal_code: '10801',
            country: 'US',
          },
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    expect(mocks.createDoc).not.toHaveBeenCalled();
  });
});
