/**
 * Customer-facing prices — confirmed Oct 2026.
 * gramsPerTooth still TODO(owner) from Blender volumes.
 */
export const pricing = {
  currency: 'usd' as const,
  /** Regular unit prices in USD at spotReference. Confirmed. */
  perTooth: {
    plain: 50,
    window: 55,
    deepcut: 60,
  } as { plain: number | null; window: number | null; deepcut: number | null },
  /**
   * Minimum after founding discount. Confirmed: $150 ≈ 3 plain at regular.
   */
  minimumOrder: 150 as number | null,
  /**
   * Mailed kits only. Confirmed: $30 — charged in the deposit, credited so
   * customer total stays the grill price. Non-refundable once kit ships.
   * Local impressions: no kit fee.
   */
  kitFee: 30 as number | null,
  kitCreditedToBalance: true,
  depositPercent: 50,
  founding: {
    enabled: true,
    slots: 5,
    discountPercent: 15 as number | null,
  },
  metal: {
    /** Confirmed: silver $/troy oz when base prices were set (Oct 6, 2026). */
    spotReference: 61.19,
    /** TODO(owner): print volume cm³ × 10.36 */
    gramsPerTooth: {
      plain: null as number | null,
      window: null as number | null,
      deepcut: null as number | null,
    },
    sprueAllowance: 0.3,
    /**
     * PLACEHOLDERS — replace with real foundry quote.
     * Profit notes: thin if foundry ≈ 3× these numbers.
     */
    foundry: {
      factor: 0.0775,
      fabPerDwt: 1.1,
      perPiece: 2.75,
    },
    passThrough: {
      enabled: true,
      repriceBandPct: 15,
      minChangePerToothUsd: 1,
      roundToUsd: 1,
    },
  },
} as const;

export type ToothStyle = 'none' | 'plain' | 'window' | 'deepcut';
export type ArchChoice = 'top' | 'bottom' | 'both';
export type OrderTier = 'founding' | 'friend' | 'standard';

export type PricingConfig = typeof pricing;

export const DWT_IN_GRAMS = 1.55517;
