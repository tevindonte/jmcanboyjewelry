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
   * Local impressions + dentist scans: no kit fee.
   */
  kitFee: 30 as number | null,
  kitCreditedToBalance: true,
  /** Only these fulfillment paths include the kit fee in the deposit. */
  kitFeeFulfillments: ['kit_mail'] as const,
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
  /**
   * Customer metal choice. Silver is the only instant-checkout metal at launch.
   * Vermeil = silver base + plating fee. Solid gold is quote-only (no Stripe).
   */
  metals: {
    silver: {
      label: 'Silver (sterling)',
      shortLabel: 'Silver',
    },
    vermeil: {
      label: 'Gold vermeil',
      shortLabel: 'Gold',
      /** PLACEHOLDER — gold plating fee on top of silver unit price. */
      platingFeePerToothUsd: 15,
    },
    gold: {
      label: 'Solid gold (10k/14k)',
      shortLabel: 'Solid gold',
      quoteOnly: true as const,
    },
  },
} as const;

export type ToothStyle = 'none' | 'plain' | 'window' | 'deepcut';
export type ArchChoice = 'top' | 'bottom' | 'both';
export type OrderTier = 'founding' | 'friend' | 'standard';
export type MetalId = keyof typeof pricing.metals;

export type PricingConfig = typeof pricing;

export const DWT_IN_GRAMS = 1.55517;

export const METAL_IDS = Object.keys(pricing.metals) as MetalId[];

export function isMetalId(value: unknown): value is MetalId {
  return value === 'silver' || value === 'vermeil' || value === 'gold';
}

export function normalizeMetalId(value: unknown): MetalId {
  return isMetalId(value) ? value : 'silver';
}
