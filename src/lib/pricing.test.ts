import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { mockPricing } = vi.hoisted(() => ({
  mockPricing: {
    currency: 'usd' as const,
    perTooth: { plain: 50, window: 55, deepcut: 60 } as {
      plain: number | null;
      window: number | null;
      deepcut: number | null;
    },
    minimumOrder: 150 as number | null,
    kitFee: 30 as number | null,
    kitCreditedToBalance: true,
    depositPercent: 50,
    founding: { enabled: true, slots: 5, discountPercent: 15 as number | null },
    metal: {
      spotReference: 61.19,
      gramsPerTooth: { plain: 2, window: 1.8, deepcut: 2.2 } as {
        plain: number | null;
        window: number | null;
        deepcut: number | null;
      },
      sprueAllowance: 0.3,
      foundry: { factor: 0.0775, fabPerDwt: 1.1, perPiece: 2.75 },
      passThrough: {
        enabled: true,
        repriceBandPct: 15,
        minChangePerToothUsd: 1,
        roundToUsd: 1,
      },
    },
  },
}));

vi.mock('./pricing.config', async () => {
  const actual = await vi.importActual<typeof import('./pricing.config')>('./pricing.config');
  return {
    ...actual,
    pricing: mockPricing,
  };
});

vi.mock('./costs.config', () => ({
  costs: {
    resinPerArchUsd: 5,
    kitCostUsd: 20,
    shippingUsd: 7,
    stripeFeeRate: 0.03,
    stripeFeeFixedUsd: 0,
    remakeRate: 0.25,
  },
}));

import {
  calculateEstimate,
  formatCents,
  foundryCostPerTooth,
  metalAdjustUsd,
  shouldRepriceAppliedSpot,
  toothIdsForArch,
  unitPriceUsd,
  usdToCents,
} from './pricing';

describe('toothIdsForArch', () => {
  it('returns both arches', () => {
    expect(toothIdsForArch('both')).toHaveLength(16);
  });
});

describe('foundry + metal adjust', () => {
  it('computes foundry cost from spot', () => {
    const cost = foundryCostPerTooth('plain', 61.19);
    expect(cost).not.toBeNull();
    expect(cost!).toBeGreaterThan(2.75);
  });

  it('metal adjust is ~0 at reference (below min change)', () => {
    expect(metalAdjustUsd('plain', 61.19)).toBe(0);
  });

  it('passes through when spot moves enough', () => {
    expect(Math.abs(metalAdjustUsd('plain', 100))).toBeGreaterThanOrEqual(1);
  });

  it('unit price = base + adjust', () => {
    expect(unitPriceUsd('plain', 61.19)).toBe(50);
  });
});

describe('shouldRepriceAppliedSpot', () => {
  it('triggers at reprice band', () => {
    expect(shouldRepriceAppliedSpot(61.19 * 1.16, 61.19)).toBe(true);
    expect(shouldRepriceAppliedSpot(61.19 * 1.05, 61.19)).toBe(false);
  });
});

describe('calculateEstimate', () => {
  it('sums unit prices for standard tier', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: { U4: 'plain', U5: 'window', U6: 'plain' },
      fulfillment: 'local_impression',
      tier: 'standard',
      appliedSpot: 61.19,
    });
    // 50+55+50 = 155
    expect(result.priced).toBe(true);
    expect(result.toothSubtotalCents).toBe(usdToCents(155));
    expect(result.totalCents).toBe(usdToCents(155));
    expect(result.depositCents).toBe(usdToCents(77.5));
  });

  it('applies minimum $150 after founding discount', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: { U4: 'plain', U5: 'plain' },
      fulfillment: 'local_impression',
      tier: 'founding',
      appliedSpot: 61.19,
    });
    // 100 - 15% = 85 → bump to 150
    expect(result.foundingDiscountCents).toBe(usdToCents(15));
    expect(result.minimumApplied).toBe(true);
    expect(result.totalCents).toBe(usdToCents(150));
  });

  it('founding 6 plain shows strikethrough math then total', () => {
    const teeth = {
      U2: 'plain',
      U3: 'plain',
      U4: 'plain',
      U5: 'plain',
      U6: 'plain',
      U7: 'plain',
    } as const;
    const result = calculateEstimate({
      arch: 'top',
      teeth: { ...teeth },
      fulfillment: 'local_impression',
      tier: 'founding',
      appliedSpot: 61.19,
    });
    // 300 - 15% = 255
    expect(result.regularToothSubtotalCents).toBe(usdToCents(300));
    expect(result.totalCents).toBe(usdToCents(255));
  });

  it('kit fee front-loaded in deposit; total stays grill price', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: {
        U2: 'plain',
        U3: 'plain',
        U4: 'plain',
        U5: 'plain',
        U6: 'plain',
        U7: 'plain',
      },
      fulfillment: 'kit_mail',
      tier: 'standard',
      appliedSpot: 61.19,
    });
    // grill 300; deposit 150+30=180; balance 120; paid 300
    expect(result.totalCents).toBe(usdToCents(300));
    expect(result.kitFeeCents).toBe(usdToCents(30));
    expect(result.depositCents).toBe(usdToCents(180));
    expect(result.balanceCents).toBe(usdToCents(120));
    expect(result.depositCents! + result.balanceCents!).toBe(result.totalCents);
  });

  it('local impression has no kit fee', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: {
        U2: 'plain',
        U3: 'plain',
        U4: 'plain',
        U5: 'plain',
        U6: 'plain',
        U7: 'plain',
      },
      fulfillment: 'local_impression',
      tier: 'standard',
      appliedSpot: 61.19,
    });
    expect(result.kitFeeCents).toBe(0);
    expect(result.depositCents).toBe(usdToCents(150));
  });

  it('friend override ignores tooth math', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: { U4: 'plain' },
      fulfillment: 'local_impression',
      tier: 'friend',
      appliedSpot: 61.19,
      priceOverrideCents: 4000,
    });
    expect(result.totalCents).toBe(4000);
  });

  it('returns POR when nothing selected', () => {
    const result = calculateEstimate({
      arch: 'both',
      teeth: {},
      fulfillment: 'kit_mail',
      tier: 'standard',
      appliedSpot: 61.19,
    });
    expect(result.priced).toBe(false);
  });
});

describe('formatCents', () => {
  it('formats', () => {
    expect(formatCents(5000)).toBe('$50');
  });
});

describe('null grams still prices at base', () => {
  beforeEach(() => {
    mockPricing.metal.gramsPerTooth = { plain: null, window: null, deepcut: null };
  });
  afterEach(() => {
    mockPricing.metal.gramsPerTooth = { plain: 2, window: 1.8, deepcut: 2.2 };
  });

  it('uses base perTooth with zero metal adjust', () => {
    expect(metalAdjustUsd('plain', 90)).toBe(0);
    expect(unitPriceUsd('plain', 90)).toBe(50);
  });
});
