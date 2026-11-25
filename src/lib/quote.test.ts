import { describe, expect, it } from 'vitest';
import {
  calculateBallparkEstimate,
  calculateQuote,
  castingCostUsd,
  isGoldSpotStale,
  roundBallparkBand,
} from './quote';
import { quoteConfig } from './quote.config';

const SILVER_TOL = 2;
const PLAT_TOL = 2;
const GOLD_TOL = 25;

describe('castingCostUsd', () => {
  it('silver V=0.82 ≈ $105.9', () => {
    expect(castingCostUsd('silver', 0.82)).toBeCloseTo(105.9, 0);
    expect(Math.abs(castingCostUsd('silver', 0.82) - 105.9)).toBeLessThanOrEqual(SILVER_TOL);
  });

  it('platinum V=0.82 ≈ $1,358', () => {
    expect(Math.abs(castingCostUsd('platinum', 0.82) - 1358)).toBeLessThanOrEqual(PLAT_TOL);
  });

  it('10k V=0.82 spot 3631.2 ≈ $544', () => {
    expect(Math.abs(castingCostUsd('gold10k', 0.82, 3631.2) - 544)).toBeLessThanOrEqual(
      GOLD_TOL,
    );
  });
});

describe('calculateQuote', () => {
  it('rejects volume 0 with a clear error (not NaN)', () => {
    expect(() =>
      calculateQuote({ metal: 'silver', volumeCm3: 0, teeth: 6 }),
    ).toThrow(/Volume must be greater than 0/);
  });

  it('rejects teeth 0 with a clear error (not NaN)', () => {
    expect(() =>
      calculateQuote({ metal: 'silver', volumeCm3: 0.82, teeth: 0 }),
    ).toThrow(/Teeth count must be a positive whole number/);
  });

  it('Top 6 plain silver V=0.82 at sell $300 → orderCost ~formula, margin ~18%', () => {
    const q = calculateQuote({
      metal: 'silver',
      volumeCm3: 0.82,
      teeth: 6,
      targetMargin: 0.25,
    });
    // Exact from config: casting≈105.88, buffered≈116.47, labor=108, ship=12, +0.30 ≈ 236.77
    expect(q.orderCost).toBeGreaterThan(234);
    expect(q.orderCost).toBeLessThan(248);
    const margin = q.marginAtPrice(300);
    expect(margin).toBeGreaterThan(0.16);
    expect(margin).toBeLessThan(0.22);
  });

  it('10k plain 8 on 8 V=2.19, 16 teeth, spot 3631.2, margin 0.25 → price ≈ $2,364', () => {
    const q = calculateQuote({
      metal: 'gold10k',
      volumeCm3: 2.19,
      teeth: 16,
      spotPerTroyOz: 3631.2,
      targetMargin: 0.25,
    });
    expect(Math.abs(q.formulaPrice - 2364)).toBeLessThanOrEqual(GOLD_TOL);
    expect(q.unverifiedPreciousMetal).toBe(true);
  });

  it('marks gold/platinum as unverified precious metal', () => {
    const g = calculateQuote({
      metal: 'gold14k',
      volumeCm3: 0.82,
      teeth: 6,
      spotPerTroyOz: 3600,
    });
    const p = calculateQuote({
      metal: 'platinum',
      volumeCm3: 0.82,
      teeth: 6,
    });
    expect(g.unverifiedPreciousMetal).toBe(true);
    expect(p.unverifiedPreciousMetal).toBe(true);
  });
});

function plainTeeth(count: number): Record<string, string> {
  const ids = [
    'U1',
    'U2',
    'U3',
    'U4',
    'U5',
    'U6',
    'U7',
    'U8',
    'L1',
    'L2',
    'L3',
    'L4',
    'L5',
    'L6',
    'L7',
    'L8',
  ];
  const teeth: Record<string, string> = {};
  for (let i = 0; i < count; i++) teeth[ids[i]] = 'plain';
  return teeth;
}

describe('calculateBallparkEstimate', () => {
  const BAND_TOL = 100;

  it('10k 6 teeth plain ≈ $950 to $1,150', () => {
    const b = calculateBallparkEstimate({
      metal: 'gold',
      goldKarat: 10,
      teeth: plainTeeth(6),
    });
    expect(b).not.toBeNull();
    expect(Math.abs(b!.low - 950)).toBeLessThanOrEqual(BAND_TOL);
    expect(Math.abs(b!.high - 1150)).toBeLessThanOrEqual(BAND_TOL);
    expect(b!.metal).toBe('gold10k');
    expect(b!.configVersion).toBe(quoteConfig.estimateConfigVersion);
  });

  it('10k 16 teeth plain ≈ $2,350 to $2,750', () => {
    const b = calculateBallparkEstimate({
      metal: 'gold10k',
      teeth: plainTeeth(16),
    });
    expect(b).not.toBeNull();
    expect(Math.abs(b!.low - 2350)).toBeLessThanOrEqual(BAND_TOL);
    expect(Math.abs(b!.high - 2750)).toBeLessThanOrEqual(BAND_TOL);
  });

  it('14k 6 teeth plain is higher than 10k and rounds to $50', () => {
    const ten = calculateBallparkEstimate({
      metal: 'gold',
      goldKarat: 10,
      teeth: plainTeeth(6),
    })!;
    const fourteen = calculateBallparkEstimate({
      metal: 'gold',
      goldKarat: 14,
      teeth: plainTeeth(6),
    })!;
    expect(fourteen.low).toBeGreaterThan(ten.low);
    expect(fourteen.low % 50).toBe(0);
    expect(fourteen.high % 50).toBe(0);
    expect(fourteen.metal).toBe('gold14k');
  });

  it('platinum 6 teeth plain applies 1.2× volume and returns a band', () => {
    const b = calculateBallparkEstimate({
      metal: 'platinum',
      teeth: plainTeeth(6),
    });
    expect(b).not.toBeNull();
    expect(b!.metal).toBe('platinum');
    expect(b!.low).toBeGreaterThan(2000);
    expect(b!.high).toBeGreaterThan(b!.low);
    expect(b!.low % 50).toBe(0);
    expect(b!.high % 50).toBe(0);
  });

  it('plating and silver return no estimate', () => {
    expect(
      calculateBallparkEstimate({ metal: 'plating', teeth: plainTeeth(6) }),
    ).toBeNull();
    expect(
      calculateBallparkEstimate({ metal: 'silver', teeth: plainTeeth(6) }),
    ).toBeNull();
  });

  it('empty teeth return no estimate', () => {
    expect(calculateBallparkEstimate({ metal: 'gold', teeth: {} })).toBeNull();
  });

  it('roundBallparkBand floors low and ceils high to $50', () => {
    expect(roundBallparkBand(966.88)).toEqual({ low: 950, high: 1150 });
    expect(roundBallparkBand(2365.15)).toEqual({ low: 2350, high: 2750 });
  });

  it('isGoldSpotStale respects updatedAt + 14 days', () => {
    const updated = new Date(`${quoteConfig.goldSpot.updatedAt}T00:00:00.000Z`);
    expect(isGoldSpotStale(new Date(updated.getTime() + 13 * 86400000))).toBe(false);
    expect(isGoldSpotStale(new Date(updated.getTime() + 15 * 86400000))).toBe(true);
  });

  it('foundry casting override replaces formula casting and still buffers', () => {
    const base = calculateQuote({
      metal: 'gold10k',
      volumeCm3: 0.822,
      teeth: 6,
      spotPerTroyOz: 3631.2,
      targetMargin: 0.25,
    });
    const overridden = calculateQuote({
      metal: 'gold10k',
      volumeCm3: 0.822,
      teeth: 6,
      spotPerTroyOz: 3631.2,
      targetMargin: 0.25,
      castingCostOverrideUsd: 400,
    });
    expect(overridden.castingCostOverridden).toBe(true);
    expect(overridden.castingCost).toBe(400);
    expect(overridden.castingBuffered).toBeCloseTo(400 * 1.05, 2);
    expect(overridden.formulaPrice).not.toBe(base.formulaPrice);
  });
});
