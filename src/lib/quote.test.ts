import { describe, expect, it } from 'vitest';
import { calculateQuote, castingCostUsd } from './quote';

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
      spotPerTroyOz: 1000,
    });
    expect(g.unverifiedPreciousMetal).toBe(true);
    expect(p.unverifiedPreciousMetal).toBe(true);
  });
});
