/**
 * Internal quote calculator constants — admin only, never public.
 * source: Vijay's instant quote tool + my estimates, Nov 24 2026
 *
 * Edit values here; keep comments when rates change.
 */
export const quoteConfig = {
  casting: {
    silver: {
      /** USD per cm³ cast volume */
      perCm3: 84,
      flat: 22,
      startup: 15,
    },
    gold: {
      /** g/cm³ by karat */
      density: { 10: 11.57, 14: 13.0 } as Record<10 | 14, number>,
      /** Fine-gold fraction by karat */
      purity: { 10: 0.417, 14: 0.583 } as Record<10 | 14, number>,
      processingPerGram: 7,
      flat: 16,
    },
    platinum: {
      perCm3: 1605,
      flat: 42,
    },
  },
  buffers: {
    /** Remake / scrap buffer on silver casting */
    silverRemake: 0.1,
    /** Spot / process buffer on gold and platinum casting */
    goldSpot: 0.05,
  },
  labor: {
    hourlyRate: 40,
    fixedHours: 1.5,
    hoursPerTooth: 0.2,
  },
  shipping: {
    silver: 12,
    gold: 15,
    platinum: 15,
  },
  /** Card processing: percent of price + fixed USD (fixed also sits inside orderCost) */
  cardFee: {
    percent: 0.03,
    flat: 0.3,
  },
  targetMarginDefault: 0.25,
  kit: {
    /** Customer-facing kit price (separate from grill margin) */
    price: 35,
    /** Your estimated kit cost all-in */
    cost: 30,
  },
  /** Public silver minimum — flag if formula price is below this */
  minimumOrderUsd: 150,
  gramsPerTroyOz: 31.1035,
} as const;

export type QuoteMetalId = 'silver' | 'gold10k' | 'gold14k' | 'platinum';
