import { describe, expect, it } from 'vitest';
import { pricing } from './pricing.config';
import {
  calculateEstimate,
  teethToPassMinimum,
  type TeethMap,
} from './pricing';

const spot = pricing.metal.spotReference;

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
    expect(result.selectedToothCount).toBe(1);
    expect(result.regularToothSubtotalCents).toBe(5500);
    expect(result.foundingDiscountCents).toBe(Math.round(5500 * 0.15));
    expect(result.preMinimumCents).toBe(5500 - Math.round(5500 * 0.15));
    expect(result.minimumApplied).toBe(true);
    expect(result.totalCents).toBe(15000);
    expect(teethToPassMinimum(result)).toBeGreaterThan(0);
  });

  it('Top 6 plain -> total 255', () => {
    const teeth: TeethMap = {
      U2: 'plain',
      U3: 'plain',
      U4: 'plain',
      U5: 'plain',
      U6: 'plain',
      U7: 'plain',
    };
    const result = calculateEstimate({
      arch: 'top',
      teeth,
      fulfillment: 'local_impression',
      tier: 'founding',
      appliedSpot: spot,
    });

    // 6 × $50 = $300 − 15% = $255
    expect(result.priced).toBe(true);
    expect(result.selectedToothCount).toBe(6);
    expect(result.regularToothSubtotalCents).toBe(30000);
    expect(result.foundingDiscountCents).toBe(4500);
    expect(result.minimumApplied).toBe(false);
    expect(result.totalCents).toBe(25500);
    expect(teethToPassMinimum(result)).toBe(0);
  });
});
