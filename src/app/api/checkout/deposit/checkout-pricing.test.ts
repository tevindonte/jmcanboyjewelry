import { describe, expect, it } from 'vitest';
import { pricing } from '@/lib/pricing.config';
import { calculateEstimate, unitPriceUsd, type TeethMap } from '@/lib/pricing';

const spot = pricing.metal.spotReference;

const top6Plain: TeethMap = {
  U2: 'plain',
  U3: 'plain',
  U4: 'plain',
  U5: 'plain',
  U6: 'plain',
  U7: 'plain',
};

/** Deposit charged by Stripe must match the frozen price snapshot math. */
function expectDepositMatchesSnapshot(
  result: ReturnType<typeof calculateEstimate>,
) {
  expect(result.priced).toBe(true);
  expect(result.depositCents).not.toBeNull();
  expect(result.priceSnapshot).not.toBeNull();
  const snap = result.priceSnapshot!;
  const kitFeeCents =
    snap.kitFeeUsd != null ? Math.round(snap.kitFeeUsd * 100) : 0;
  const baseDeposit = Math.round(
    (result.afterDiscountCents! * pricing.depositPercent) / 100,
  );
  const expectedTotal = pricing.kitCreditedToBalance
    ? result.afterDiscountCents!
    : result.afterDiscountCents! + kitFeeCents;
  expect(result.kitFeeCents).toBe(kitFeeCents);
  expect(result.depositCents).toBe(baseDeposit + kitFeeCents);
  expect(result.totalCents).toBe(expectedTotal);
  expect(result.balanceCents).toBe(expectedTotal - (baseDeposit + kitFeeCents));
}

describe('checkout deposit vs price snapshot', () => {
  it('normal (standard) kit_mail order', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'kit_mail',
      tier: 'standard',
      appliedSpot: spot,
      metal: 'silver',
    });
    expectDepositMatchesSnapshot(result);
    expect(result.kitFeeCents).toBe(3500);
    expect(result.priceSnapshot?.kitFeeUsd).toBe(35);
    expect(result.priceSnapshot?.tier).toBe('standard');
  });

  it('founding Top 6 plain with kit: grill 255, deposit 162.50, balance 127.50, total 290', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'kit_mail',
      tier: 'founding',
      appliedSpot: spot,
      metal: 'silver',
    });
    expectDepositMatchesSnapshot(result);
    expect(result.afterDiscountCents).toBe(25500);
    expect(result.kitFeeCents).toBe(3500);
    expect(result.totalCents).toBe(29000);
    expect(result.depositCents).toBe(16250);
    expect(result.balanceCents).toBe(12750);
  });

  it('founding-discount order without kit', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: top6Plain,
      fulfillment: 'local_impression',
      tier: 'founding',
      appliedSpot: spot,
      metal: 'silver',
    });
    expectDepositMatchesSnapshot(result);
    expect(result.foundingDiscountCents).toBeGreaterThan(0);
    expect(result.priceSnapshot?.tier).toBe('founding');
    expect(result.priceSnapshot?.foundingDiscountPercent).toBe(15);
    // 6×50 = 300 − 15% = 255 → deposit 50% = 127.50
    expect(result.totalCents).toBe(25500);
    expect(result.depositCents).toBe(12750);
  });

  it('minimum-order case', () => {
    const result = calculateEstimate({
      arch: 'top',
      teeth: { U4: 'window' },
      fulfillment: 'local_impression',
      tier: 'founding',
      appliedSpot: spot,
      metal: 'silver',
    });
    expectDepositMatchesSnapshot(result);
    expect(result.minimumApplied).toBe(true);
    expect(result.afterDiscountCents).toBe(15000);
    expect(result.depositCents).toBe(7500);
    expect(result.priceSnapshot?.minimumOrderUsd).toBe(150);
  });

  it('scan-upload path omits kit fee from deposit', () => {
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
    expectDepositMatchesSnapshot(kit);
    expectDepositMatchesSnapshot(scan);
    expect(scan.kitFeeCents).toBe(0);
    expect(scan.priceSnapshot?.kitFeeUsd).toBe(0);
    expect(kit.depositCents).toBe((scan.depositCents ?? 0) + (kit.kitFeeCents ?? 0));
  });

  it('public silver per-tooth prices stay 50/55/60 at spot reference', () => {
    expect(pricing.metal.spotReference).toBe(40.68);
    expect(pricing.perTooth.plain).toBe(50);
    expect(pricing.perTooth.window).toBe(55);
    expect(pricing.perTooth.deepcut).toBe(60);
    expect(unitPriceUsd('plain', pricing.metal.spotReference)).toBe(50);
    expect(unitPriceUsd('window', pricing.metal.spotReference)).toBe(55);
    expect(unitPriceUsd('deepcut', pricing.metal.spotReference)).toBe(60);
  });
});
