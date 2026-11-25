/**
 * Pure internal quote calculator.
 * Do not import from public client components (builder). Use /api/estimate for ballparks.
 * Admin quote UI may import this on the server/client admin surface only.
 */
import {
  GOLD_SPOT_STALE_DAYS,
  quoteConfig,
  type BallparkMetalId,
  type QuoteMetalId,
} from './quote.config';

export type QuoteInput = {
  metal: QuoteMetalId;
  /** Total castable volume in cm³ */
  volumeCm3: number;
  teeth: number;
  /** Manual gold/platinum spot $/troy oz (ignored for silver) */
  spotPerTroyOz?: number;
  /** Target net margin as fraction, e.g. 0.25 */
  targetMargin?: number;
  /** Include customer kit line (separate from grill margin) */
  includeKit?: boolean;
  /** Optional competitor price for comparison */
  competitorPriceUsd?: number | null;
};

export type QuoteResult = {
  metal: QuoteMetalId;
  volumeCm3: number;
  teeth: number;
  hours: number;
  castingCost: number;
  bufferRate: number;
  castingBuffered: number;
  laborCost: number;
  shippingCost: number;
  cardFlat: number;
  orderCost: number;
  targetMargin: number;
  formulaPrice: number;
  pricePerTooth: number | null;
  belowMinimum: boolean;
  kitPrice: number;
  kitCost: number;
  includeKit: boolean;
  totalWithKit: number;
  /** Margin fraction at an entered sell price (grill only, before kit). */
  marginAtPrice: (sellPriceUsd: number) => number;
  /** Cash left after non-labor costs (casting buffer, shipping, card %) at sell price. */
  cashAfterNonLabor: (sellPriceUsd: number) => number;
  /** (price − nonLaborCosts) / hours */
  effectiveHourly: (sellPriceUsd: number) => number;
  competitorPriceUsd: number | null;
  unverifiedPreciousMetal: boolean;
  lineItems: { label: string; amount: number }[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function castingCostUsd(
  metal: QuoteMetalId,
  volumeCm3: number,
  spotPerTroyOz?: number,
): number {
  const { casting, gramsPerTroyOz } = quoteConfig;
  if (metal === 'silver') {
    return casting.silver.perCm3 * volumeCm3 + casting.silver.flat + casting.silver.startup;
  }
  if (metal === 'platinum') {
    return casting.platinum.perCm3 * volumeCm3 + casting.platinum.flat;
  }
  const karat = metal === 'gold10k' ? 10 : 14;
  const spot = spotPerTroyOz ?? 0;
  const density = casting.gold.density[karat];
  const purity = casting.gold.purity[karat];
  const metalPerGram = (spot / gramsPerTroyOz) * purity + casting.gold.processingPerGram;
  return volumeCm3 * density * metalPerGram + casting.gold.flat;
}

export function bufferRateFor(metal: QuoteMetalId): number {
  return metal === 'silver' ? quoteConfig.buffers.silverRemake : quoteConfig.buffers.goldSpot;
}

export function shippingFor(metal: QuoteMetalId): number {
  if (metal === 'silver') return quoteConfig.shipping.silver;
  if (metal === 'platinum') return quoteConfig.shipping.platinum;
  return quoteConfig.shipping.gold;
}

export function laborHours(teeth: number): number {
  return quoteConfig.labor.fixedHours + quoteConfig.labor.hoursPerTooth * teeth;
}

export function laborCostUsd(teeth: number): number {
  return laborHours(teeth) * quoteConfig.labor.hourlyRate;
}

/**
 * Build a full quote breakdown. Throws a clear Error for invalid volume/teeth.
 */
export function calculateQuote(input: QuoteInput): QuoteResult {
  const volumeCm3 = input.volumeCm3;
  const teeth = input.teeth;
  if (!(volumeCm3 > 0) || Number.isNaN(volumeCm3)) {
    throw new Error('Volume must be greater than 0 cm³.');
  }
  if (!(teeth > 0) || !Number.isFinite(teeth) || Math.floor(teeth) !== teeth) {
    throw new Error('Teeth count must be a positive whole number.');
  }
  if (
    (input.metal === 'gold10k' || input.metal === 'gold14k') &&
    !(input.spotPerTroyOz != null && input.spotPerTroyOz > 0)
  ) {
    throw new Error('Enter a gold spot price ($/troy oz).');
  }

  const targetMargin = input.targetMargin ?? quoteConfig.targetMarginDefault;
  if (!(targetMargin >= 0) || targetMargin >= 1 - quoteConfig.cardFee.percent) {
    throw new Error('Target margin must be between 0 and less than (1 − card %).');
  }

  const castingCost = castingCostUsd(input.metal, volumeCm3, input.spotPerTroyOz);
  const bufferRate = bufferRateFor(input.metal);
  const castingBuffered = castingCost * (1 + bufferRate);
  const hours = laborHours(teeth);
  const laborCost = laborCostUsd(teeth);
  const shippingCost = shippingFor(input.metal);
  const cardFlat = quoteConfig.cardFee.flat;
  const orderCost = castingBuffered + laborCost + shippingCost + cardFlat;

  const denom = 1 - quoteConfig.cardFee.percent - targetMargin;
  const formulaPrice = orderCost / denom;
  const pricePerTooth = formulaPrice / teeth;
  const belowMinimum = formulaPrice < quoteConfig.minimumOrderUsd;

  const includeKit = Boolean(input.includeKit);
  const kitPrice = includeKit ? quoteConfig.kit.price : 0;
  const kitCost = includeKit ? quoteConfig.kit.cost : 0;

  const nonLaborBase = castingBuffered + shippingCost;

  function marginAtPrice(sellPriceUsd: number): number {
    if (!(sellPriceUsd > 0)) return NaN;
    const net =
      sellPriceUsd * (1 - quoteConfig.cardFee.percent) -
      cardFlat -
      castingBuffered -
      laborCost -
      shippingCost;
    return net / sellPriceUsd;
  }

  function cashAfterNonLabor(sellPriceUsd: number): number {
    if (!(sellPriceUsd > 0)) return NaN;
    const cardPercent = sellPriceUsd * quoteConfig.cardFee.percent;
    return sellPriceUsd - nonLaborBase - cardPercent - cardFlat;
  }

  function effectiveHourly(sellPriceUsd: number): number {
    if (!(hours > 0)) return NaN;
    return cashAfterNonLabor(sellPriceUsd) / hours;
  }

  const lineItems: { label: string; amount: number }[] = [
    { label: 'Casting', amount: round2(castingCost) },
    { label: `Buffer (${(bufferRate * 100).toFixed(0)}%)`, amount: round2(castingBuffered - castingCost) },
    { label: 'Labor', amount: round2(laborCost) },
    { label: 'Shipping', amount: round2(shippingCost) },
    { label: 'Card flat', amount: round2(cardFlat) },
    { label: 'Order cost', amount: round2(orderCost) },
    { label: 'Formula price (grill)', amount: round2(formulaPrice) },
  ];
  if (includeKit) {
    lineItems.push({ label: 'Kit (customer price)', amount: kitPrice });
    lineItems.push({ label: 'Total with kit', amount: round2(formulaPrice + kitPrice) });
  }

  return {
    metal: input.metal,
    volumeCm3,
    teeth,
    hours,
    castingCost: round2(castingCost),
    bufferRate,
    castingBuffered: round2(castingBuffered),
    laborCost: round2(laborCost),
    shippingCost: round2(shippingCost),
    cardFlat,
    orderCost: round2(orderCost),
    targetMargin,
    formulaPrice: round2(formulaPrice),
    pricePerTooth: round2(pricePerTooth),
    belowMinimum,
    kitPrice,
    kitCost,
    includeKit,
    totalWithKit: round2(formulaPrice + kitPrice),
    marginAtPrice,
    cashAfterNonLabor,
    effectiveHourly,
    competitorPriceUsd:
      input.competitorPriceUsd != null && input.competitorPriceUsd > 0
        ? input.competitorPriceUsd
        : null,
    unverifiedPreciousMetal: input.metal !== 'silver',
    lineItems,
  };
}

export type BallparkBand = { low: number; high: number };

/** Round formula price: low down / high up to nearest $50. High = low_raw * 1.15 before rounding. */
export function roundBallparkBand(formulaPriceUsd: number): BallparkBand {
  const low = Math.floor(formulaPriceUsd / 50) * 50;
  const high = Math.ceil((formulaPriceUsd * 1.15) / 50) * 50;
  return { low, high };
}

/**
 * Sum castable volume from a teeth map. Platinum applies platinumMultiplier.
 */
export function volumeCm3ForTeeth(
  teeth: Record<string, string>,
  metal: BallparkMetalId,
): { volumeCm3: number; toothCount: number } {
  let volumeCm3 = 0;
  let toothCount = 0;
  for (const style of Object.values(teeth)) {
    if (style === 'plain' || style === 'window' || style === 'deepcut') {
      volumeCm3 += quoteConfig.volumes[style];
      toothCount += 1;
    }
  }
  if (metal === 'platinum') {
    volumeCm3 *= quoteConfig.volumes.platinumMultiplier;
  }
  return { volumeCm3, toothCount };
}

export function resolveBallparkMetal(
  metal: string,
  goldKarat: 10 | 14 = 10,
): BallparkMetalId | null {
  if (metal === 'gold10k' || metal === 'gold14k' || metal === 'platinum') {
    return metal;
  }
  if (metal === 'gold') {
    return goldKarat === 14 ? 'gold14k' : 'gold10k';
  }
  return null;
}

/**
 * Public-facing ballpark from the admin quote formula at default margin.
 * Returns null for silver, plating, custom-only, or empty teeth (no estimate).
 */
export function calculateBallparkEstimate(input: {
  metal: string;
  teeth: Record<string, string>;
  goldKarat?: 10 | 14;
}): (BallparkBand & { metal: BallparkMetalId; configVersion: string }) | null {
  const quoteMetal = resolveBallparkMetal(input.metal, input.goldKarat ?? 10);
  if (!quoteMetal) return null;

  const { volumeCm3, toothCount } = volumeCm3ForTeeth(input.teeth, quoteMetal);
  if (toothCount === 0 || !(volumeCm3 > 0)) return null;

  const quote = calculateQuote({
    metal: quoteMetal,
    volumeCm3,
    teeth: toothCount,
    spotPerTroyOz: quoteConfig.goldSpot.usdPerTroyOz,
    targetMargin: quoteConfig.targetMarginDefault,
  });

  const band = roundBallparkBand(quote.formulaPrice);
  return {
    ...band,
    metal: quoteMetal,
    configVersion: quoteConfig.estimateConfigVersion,
  };
}

/** True when the manual gold spot date is older than GOLD_SPOT_STALE_DAYS. */
export function isGoldSpotStale(now = new Date()): boolean {
  const raw = quoteConfig.goldSpot.updatedAt;
  const updated = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(updated.getTime())) return true;
  const ageMs = now.getTime() - updated.getTime();
  return ageMs > GOLD_SPOT_STALE_DAYS * 24 * 60 * 60 * 1000;
}
