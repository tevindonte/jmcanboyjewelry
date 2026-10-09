import { describe, expect, it } from 'vitest';
import { pricing } from './pricing.config';
import {
  calculateEstimate,
  teethToPassMinimum,
  unitPriceForMetalUsd,
  type TeethMap,
} from './pricing';

const spot = pricing.metal.spotReference;

const top6Plain: TeethMap = {
  U2: 'plain',
  U3: 'plain',
  U4: 'plain',
  U5: 'plain',
  U6: 'plain',
  U7: 'plain',
};

describe('calculateEstimate', () => {
  it('1 window tooth -> total 150 (minimum after founding)', () => {
    const teeth: TeethMap = { U4: 'window' };
    const result = calculateEstimate({
      arch: 'top',
      teeth,
      fulfillment: 'local_impression',
      tier: 'founding',
      appliedSpot: spot,
    });

    // $55 − 15% = $46.75 → clamped to $150
    expect(result.priced).toBe(true);
    expect(result.quoteOnly).toBe(false);
    expect(result.metalId).toBe('silver');
    expect(result.selectedToothCount).toBe(1);
    expect(result.regularToothSubtotalCents).toBe(5500);
    expect(result.foundingDiscountCents).toBe(Math.round(5500 * 0.15));
    expect(result.preMinimumCents).toBe(5500 - Math.round(5500 * 0.15));
    expect(result.minimumApplied).toBe(true);
    expect(result.totalCents).toBe(15000);
    expect(teethToPassMinimum(result)).toBeGreaterThan(0);
  });

  it('Top 6 plain -> total 255', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'local_impression',
      tier: 'founding',
      appliedSpot: spot,
      metal: 'silver',
    });

    // 6 × $50 = $300 − 15% = $255
    expect(result.priced).toBe(true);
    expect(result.quoteOnly).toBe(false);
    expect(result.selectedToothCount).toBe(6);
    expect(result.regularToothSubtotalCents).toBe(30000);
    expect(result.foundingDiscountCents).toBe(4500);
    expect(result.minimumApplied).toBe(false);
    expect(result.totalCents).toBe(25500);
    expect(teethToPassMinimum(result)).toBe(0);
  });

  it('vermeil Top 6 plain = silver price + plating fee per tooth', () => {
    const plate = pricing.metals.vermeil.platingFeePerToothUsd;
    expect(unitPriceForMetalUsd('plain', spot, 'vermeil')).toBe(50 + plate);

    const result = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'local_impression',
      tier: 'founding',
      appliedSpot: spot,
      metal: 'vermeil',
    });

    // 6 × ($50 + $15) = $390 − 15% = $331.50
    const regular = 6 * (50 + plate) * 100;
    expect(result.priced).toBe(true);
    expect(result.quoteOnly).toBe(false);
    expect(result.metalId).toBe('vermeil');
    expect(result.platingFeeCents).toBe(6 * plate * 100);
    expect(result.regularToothSubtotalCents).toBe(regular);
    expect(result.foundingDiscountCents).toBe(Math.round(regular * 0.15));
    expect(result.totalCents).toBe(regular - Math.round(regular * 0.15));
  });

  it('gold is quote-only and never priced for Stripe', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'local_impression',
      tier: 'founding',
      appliedSpot: spot,
      metal: 'gold',
    });

    expect(result.priced).toBe(false);
    expect(result.quoteOnly).toBe(true);
    expect(result.metalId).toBe('gold');
    expect(result.totalCents).toBeNull();
    expect(result.depositCents).toBeNull();
    expect(result.displayLabel).toBe('Quoted per order');
    expect(unitPriceForMetalUsd('plain', spot, 'gold')).toBeNull();
  });

  it('gold with admin override becomes priced', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'local_impression',
      tier: 'standard',
      appliedSpot: spot,
      metal: 'gold',
      priceOverrideCents: 120000,
    });

    expect(result.priced).toBe(true);
    expect(result.quoteOnly).toBe(false);
    expect(result.totalCents).toBe(120000);
    expect(result.depositCents).toBe(60000);
  });

  it('dentist_scan omits kit fee from deposit (kit_mail includes it)', () => {
    const kit = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'kit_mail',
      tier: 'standard',
      appliedSpot: spot,
      metal: 'silver',
    });
    const scan = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'dentist_scan',
      tier: 'standard',
      appliedSpot: spot,
      metal: 'silver',
    });

    expect(kit.priced).toBe(true);
    expect(scan.priced).toBe(true);
    expect(kit.kitFeeCents).toBe(Math.round((pricing.kitFee ?? 0) * 100));
    expect(scan.kitFeeCents).toBe(0);
    expect(kit.totalCents).toBe(scan.totalCents);
    expect(kit.depositCents).toBe((scan.depositCents ?? 0) + (kit.kitFeeCents ?? 0));
    expect(scan.priceSnapshot?.kitFeeUsd).toBe(0);
    expect(kit.priceSnapshot?.kitFeeUsd).toBe(pricing.kitFee);
  });
});
