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
   * Mailed kits only. Confirmed Nov 2026: $35 — charged in the deposit,
   * NOT credited to the grill price (customer pays grill + kit).
   * Local impressions + dentist scans: no kit fee.
   */
  kitFee: 35 as number | null,
  kitCreditedToBalance: false,
  /** Only these fulfillment paths include the kit fee in the deposit. */
  kitFeeFulfillments: ['kit_mail'] as const,
  depositPercent: 50,
  founding: {
    enabled: true,
    slots: 5,
    discountPercent: 15 as number | null,
  },
  metal: {
    /** Silver $/troy oz reference for pass-through math (updated Nov 2026). */
    spotReference: 40.68,
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
   * Customer metal choice.
   * Silver: instant checkout. Gold / platinum: quoted per order.
   * Gold plating + stones: upon request. Not dental gold, not permanent.
   */
  metals: {
    silver: {
      label: 'Sterling silver',
      shortLabel: 'Silver',
    },
    gold: {
      label: 'Gold',
      shortLabel: 'Gold',
      quoteOnly: true as const,
      hint: 'Quoted per order · not dental / not permanent',
    },
    platinum: {
      label: 'Platinum',
      shortLabel: 'Platinum',
      quoteOnly: true as const,
      hint: 'Quoted per order',
    },
    plating: {
      label: 'Gold plating',
      shortLabel: 'Plating',
      quoteOnly: true as const,
      hint: 'Upon request',
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
  return (
    value === 'silver' ||
    value === 'gold' ||
    value === 'platinum' ||
    value === 'plating'
  );
}

/** Map legacy IDs (e.g. vermeil) onto the current catalog. */
export function normalizeMetalId(value: unknown): MetalId {
  if (value === 'vermeil') return 'plating';
  return isMetalId(value) ? value : 'silver';
}

export function isQuoteOnlyMetal(metalId: MetalId): boolean {
  const entry = pricing.metals[metalId];
  return Boolean(entry && 'quoteOnly' in entry && entry.quoteOnly);
}
