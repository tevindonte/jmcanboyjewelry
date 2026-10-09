import {
  pricing,
  DWT_IN_GRAMS,
  normalizeMetalId,
  type ArchChoice,
  type MetalId,
  type OrderTier,
  type ToothStyle,
} from './pricing.config';
import { costs } from './costs.config';

export type ToothId =
  | `U${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `L${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export type TeethMap = Partial<Record<ToothId, ToothStyle>>;

export type PriceSnapshot = {
  appliedSpot: number;
  spotReference: number;
  unitPricesUsd: Partial<Record<'plain' | 'window' | 'deepcut', number>>;
  metalAdjustUsd: Partial<Record<'plain' | 'window' | 'deepcut', number>>;
  metalId: MetalId;
  platingFeePerToothUsd: number;
  tier: OrderTier;
  foundingDiscountPercent: number | null;
  kitFeeUsd: number | null;
  minimumOrderUsd: number | null;
  frozenAt: string;
};

export type FulfillmentChoice = 'kit_mail' | 'local_impression' | 'dentist_scan';

export type EstimateInput = {
  arch: ArchChoice;
  teeth: TeethMap;
  fulfillment: FulfillmentChoice;
  tier: OrderTier;
  /** Spot currently applied to live prices (from settings). */
  appliedSpot: number;
  /** Customer metal choice. Defaults to silver. */
  metal?: MetalId;
  /** Friend / gold quote: manual total in cents overrides estimate. */
  priceOverrideCents?: number | null;
};

/** Whether this fulfillment path includes the mailed-kit fee in the deposit. */
export function fulfillmentChargesKitFee(fulfillment: FulfillmentChoice): boolean {
  return (pricing.kitFeeFulfillments as readonly string[]).includes(fulfillment);
}

export type EstimateResult = {
  priced: boolean;
  /** True when metal is quote-only (solid gold) and no manual override. */
  quoteOnly: boolean;
  currency: string;
  tier: OrderTier;
  metalId: MetalId;
  platingFeePerToothUsd: number;
  platingFeeCents: number | null;
  unitPricesUsd: Partial<Record<'plain' | 'window' | 'deepcut', number>>;
  metalAdjustUsd: Partial<Record<'plain' | 'window' | 'deepcut', number>>;
  toothSubtotalCents: number | null;
  /** Regular (pre-discount) tooth subtotal. */
  regularToothSubtotalCents: number | null;
  foundingDiscountCents: number | null;
  /**
   * Grill total after founding discount, before minimum clamp.
   * Useful for explaining why the minimum order line appears.
   */
  preMinimumCents: number | null;
  afterDiscountCents: number | null;
  minimumApplied: boolean;
  kitFeeCents: number | null;
  totalCents: number | null;
  depositCents: number | null;
  balanceCents: number | null;
  selectedToothCount: number;
  displayLabel: string;
  priceSnapshot: PriceSnapshot | null;
};

const STYLE_KEYS = ['plain', 'window', 'deepcut'] as const;

export function toothIdsForArch(arch: ArchChoice): ToothId[] {
  const top = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `U${n}` as ToothId);
  const bottom = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `L${n}` as ToothId);
  if (arch === 'top') return top;
  if (arch === 'bottom') return bottom;
  return [...top, ...bottom];
}

export function isPricedStyle(style: ToothStyle): style is 'plain' | 'window' | 'deepcut' {
  return style === 'plain' || style === 'window' || style === 'deepcut';
}

export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}

export function roundTo(value: number, stepUsd: number): number {
  if (stepUsd <= 0) return value;
  return Math.round(value / stepUsd) * stepUsd;
}

/** Foundry metal charge per DWT at a given spot ($/oz). */
export function ratePerDwt(spot: number): number {
  const { factor, fabPerDwt } = pricing.metal.foundry;
  return spot * factor + fabPerDwt;
}

export function dwtPerTooth(style: 'plain' | 'window' | 'deepcut'): number | null {
  const grams = pricing.metal.gramsPerTooth[style];
  if (grams === null) return null;
  return (grams * (1 + pricing.metal.sprueAllowance)) / DWT_IN_GRAMS;
}

/** Per-tooth foundry cost in USD at spot. Null if grams unset. */
export function foundryCostPerTooth(
  style: 'plain' | 'window' | 'deepcut',
  spot: number,
): number | null {
  const dwt = dwtPerTooth(style);
  if (dwt === null) return null;
  return dwt * ratePerDwt(spot) + pricing.metal.foundry.perPiece;
}

/**
 * Metal pass-through adjustment vs reference spot.
 * Returns 0 when grams are unset (base prices still usable).
 * Applies minChangePerToothUsd gate when computing live adjust from appliedSpot.
 */
export function metalAdjustUsd(
  style: 'plain' | 'window' | 'deepcut',
  appliedSpot: number,
  opts?: { enforceMinChange?: boolean },
): number {
  if (!pricing.metal.passThrough.enabled) return 0;

  const atApplied = foundryCostPerTooth(style, appliedSpot);
  const atRef = foundryCostPerTooth(style, pricing.metal.spotReference);
  if (atApplied === null || atRef === null) return 0;

  let adjust = atApplied - atRef;
  const { minChangePerToothUsd, roundToUsd } = pricing.metal.passThrough;

  if (opts?.enforceMinChange !== false && Math.abs(adjust) < minChangePerToothUsd) {
    return 0;
  }

  return roundTo(adjust, roundToUsd);
}

/** Live unit price in USD for a style at appliedSpot. */
export function unitPriceUsd(
  style: 'plain' | 'window' | 'deepcut',
  appliedSpot: number,
): number | null {
  const base = pricing.perTooth[style];
  if (base === null) return null;
  const adjust = metalAdjustUsd(style, appliedSpot);
  return roundTo(base + adjust, pricing.metal.passThrough.roundToUsd);
}

/**
 * Whether latest spot should move applied_spot (band crossed).
 * Admin "Apply" bypasses this.
 */
export function shouldRepriceAppliedSpot(
  latestSpot: number,
  appliedSpot: number,
): boolean {
  if (!pricing.metal.passThrough.enabled) return false;
  if (appliedSpot <= 0) return true;
  const pct = (Math.abs(latestSpot - appliedSpot) / appliedSpot) * 100;
  return pct >= pricing.metal.passThrough.repriceBandPct;
}

/**
 * Pending per-tooth adjustments if we applied `candidateSpot` now.
 */
export function pendingAdjustments(candidateSpot: number): Record<
  'plain' | 'window' | 'deepcut',
  { adjustUsd: number; unitUsd: number | null; foundryUsd: number | null }
> {
  const out = {} as Record<
    'plain' | 'window' | 'deepcut',
    { adjustUsd: number; unitUsd: number | null; foundryUsd: number | null }
  >;
  for (const style of STYLE_KEYS) {
    const adjustUsd = metalAdjustUsd(style, candidateSpot);
    const base = pricing.perTooth[style];
    out[style] = {
      adjustUsd,
      unitUsd:
        base === null
          ? null
          : roundTo(base + adjustUsd, pricing.metal.passThrough.roundToUsd),
      foundryUsd: foundryCostPerTooth(style, candidateSpot),
    };
  }
  return out;
}

function platingFeePerToothUsd(metalId: MetalId): number {
  if (metalId !== 'vermeil') return 0;
  return pricing.metals.vermeil.platingFeePerToothUsd;
}

/** Live unit price including vermeil plating when applicable. */
export function unitPriceForMetalUsd(
  style: 'plain' | 'window' | 'deepcut',
  appliedSpot: number,
  metalId: MetalId = 'silver',
): number | null {
  if (metalId === 'gold') return null;
  const base = unitPriceUsd(style, appliedSpot);
  if (base === null) return null;
  return roundTo(base + platingFeePerToothUsd(metalId), pricing.metal.passThrough.roundToUsd);
}

function unpricedResult(
  partial: Partial<EstimateResult> & {
    tier: OrderTier;
    selectedToothCount: number;
    metalId?: MetalId;
  },
): EstimateResult {
  const metalId = partial.metalId ?? 'silver';
  const quoteOnly = metalId === 'gold';
  return {
    priced: false,
    currency: pricing.currency,
    platingFeePerToothUsd: platingFeePerToothUsd(metalId),
    platingFeeCents: null,
    unitPricesUsd: {},
    metalAdjustUsd: {},
    toothSubtotalCents: null,
    regularToothSubtotalCents: null,
    foundingDiscountCents: null,
    preMinimumCents: null,
    afterDiscountCents: null,
    minimumApplied: false,
    kitFeeCents: null,
    totalCents: null,
    depositCents: null,
    balanceCents: null,
    displayLabel: quoteOnly ? 'Quoted per order' : 'Price on request',
    priceSnapshot: null,
    ...partial,
    metalId,
    quoteOnly: partial.quoteOnly ?? quoteOnly,
  };
}

/**
 * How many more plain (cheapest) teeth are needed so the post-discount
 * subtotal clears the minimum order. Returns 0 when already clear / empty.
 */
export function teethToPassMinimum(
  estimate: Pick<
    EstimateResult,
    | 'minimumApplied'
    | 'preMinimumCents'
    | 'unitPricesUsd'
    | 'tier'
    | 'selectedToothCount'
  >,
): number {
  if (!estimate.minimumApplied || estimate.selectedToothCount === 0) return 0;
  if (pricing.minimumOrder === null) return 0;
  const pre = estimate.preMinimumCents ?? 0;
  const minCents = usdToCents(pricing.minimumOrder);
  const gap = minCents - pre;
  if (gap <= 0) return 0;

  const plainUsd = estimate.unitPricesUsd.plain;
  if (plainUsd == null || plainUsd <= 0) return 0;

  let perToothCents = usdToCents(plainUsd);
  if (
    estimate.tier === 'founding' &&
    pricing.founding.enabled &&
    pricing.founding.discountPercent != null
  ) {
    perToothCents = Math.round(
      (perToothCents * (100 - pricing.founding.discountPercent)) / 100,
    );
  }
  if (perToothCents <= 0) return 0;
  return Math.ceil(gap / perToothCents);
}

/**
 * Pure estimate — client UI and server checkout.
 * Server recomputes; never trust a client-sent total.
 */
export function calculateEstimate(input: EstimateInput): EstimateResult {
  const { tier, appliedSpot } = input;
  const metalId = normalizeMetalId(input.metal);
  const plateUsd = platingFeePerToothUsd(metalId);

  // Friend / gold manual override
  if (input.priceOverrideCents != null && (tier === 'friend' || metalId === 'gold')) {
    const totalCents = input.priceOverrideCents;
    const depositCents = Math.round((totalCents * pricing.depositPercent) / 100);
    const snapshot: PriceSnapshot = {
      appliedSpot,
      spotReference: pricing.metal.spotReference,
      unitPricesUsd: {},
      metalAdjustUsd: {},
      metalId,
      platingFeePerToothUsd: plateUsd,
      tier,
      foundingDiscountPercent: null,
      kitFeeUsd: null,
      minimumOrderUsd: pricing.minimumOrder,
      frozenAt: new Date().toISOString(),
    };
    return {
      priced: true,
      quoteOnly: false,
      currency: pricing.currency,
      tier,
      metalId,
      platingFeePerToothUsd: plateUsd,
      platingFeeCents: 0,
      unitPricesUsd: {},
      metalAdjustUsd: {},
      toothSubtotalCents: totalCents,
      regularToothSubtotalCents: totalCents,
      foundingDiscountCents: 0,
      preMinimumCents: totalCents,
      afterDiscountCents: totalCents,
      minimumApplied: false,
      kitFeeCents: 0,
      totalCents,
      depositCents,
      balanceCents: totalCents - depositCents,
      selectedToothCount: 0,
      displayLabel: formatCents(totalCents),
      priceSnapshot: snapshot,
    };
  }

  // Solid gold with no override — never Stripe-priced at launch
  if (metalId === 'gold') {
    const allowed = new Set(toothIdsForArch(input.arch));
    let selectedToothCount = 0;
    for (const [id, style] of Object.entries(input.teeth) as [ToothId, ToothStyle][]) {
      if (!allowed.has(id)) continue;
      if (!style || style === 'none') continue;
      selectedToothCount += 1;
    }
    return unpricedResult({
      tier,
      metalId,
      quoteOnly: true,
      selectedToothCount,
      displayLabel: 'Quoted per order',
    });
  }

  const allowed = new Set(toothIdsForArch(input.arch));
  const unitPricesUsd: Partial<Record<'plain' | 'window' | 'deepcut', number>> = {};
  const metalAdj: Partial<Record<'plain' | 'window' | 'deepcut', number>> = {};

  for (const style of STYLE_KEYS) {
    const unit = unitPriceForMetalUsd(style, appliedSpot, metalId);
    if (unit !== null) unitPricesUsd[style] = unit;
    metalAdj[style] = metalAdjustUsd(style, appliedSpot);
  }

  let selectedToothCount = 0;
  let toothSubtotalUsd = 0;
  let missingUnit = false;

  for (const [id, style] of Object.entries(input.teeth) as [ToothId, ToothStyle][]) {
    if (!allowed.has(id)) continue;
    if (!style || style === 'none') continue;
    selectedToothCount += 1;
    if (!isPricedStyle(style)) continue;
    const unit = unitPricesUsd[style];
    if (unit === undefined || unit === null) {
      missingUnit = true;
    } else {
      toothSubtotalUsd += unit;
    }
  }

  const platingFeeCents = usdToCents(plateUsd * selectedToothCount);

  // Empty design: show $0 (not "Price on request")
  if (!missingUnit && selectedToothCount === 0) {
    return {
      priced: true,
      quoteOnly: false,
      currency: pricing.currency,
      tier,
      metalId,
      platingFeePerToothUsd: plateUsd,
      platingFeeCents: 0,
      unitPricesUsd,
      metalAdjustUsd: metalAdj,
      toothSubtotalCents: 0,
      regularToothSubtotalCents: 0,
      foundingDiscountCents: 0,
      preMinimumCents: 0,
      afterDiscountCents: 0,
      minimumApplied: false,
      kitFeeCents: 0,
      totalCents: 0,
      depositCents: 0,
      balanceCents: 0,
      selectedToothCount: 0,
      displayLabel: formatCents(0),
      priceSnapshot: null,
    };
  }

  if (missingUnit) {
    return unpricedResult({
      tier,
      metalId,
      selectedToothCount,
      unitPricesUsd,
      metalAdjustUsd: metalAdj,
      platingFeeCents,
      kitFeeCents: fulfillmentChargesKitFee(input.fulfillment)
        ? pricing.kitFee != null
          ? usdToCents(pricing.kitFee)
          : null
        : 0,
    });
  }

  const regularToothSubtotalCents = usdToCents(toothSubtotalUsd);
  let foundingDiscountCents = 0;

  if (tier === 'founding' && pricing.founding.enabled) {
    if (pricing.founding.discountPercent === null) {
      return unpricedResult({
        tier,
        metalId,
        selectedToothCount,
        unitPricesUsd,
        metalAdjustUsd: metalAdj,
        platingFeeCents,
        toothSubtotalCents: regularToothSubtotalCents,
        regularToothSubtotalCents,
      });
    }
    foundingDiscountCents = Math.round(
      (regularToothSubtotalCents * pricing.founding.discountPercent) / 100,
    );
  }

  const preMinimumCents = regularToothSubtotalCents - foundingDiscountCents;
  let afterDiscountCents = preMinimumCents;
  let minimumApplied = false;

  if (pricing.minimumOrder !== null) {
    const minCents = usdToCents(pricing.minimumOrder);
    if (afterDiscountCents < minCents) {
      afterDiscountCents = minCents;
      minimumApplied = true;
    }
  }

  let kitFeeCents = 0;
  if (fulfillmentChargesKitFee(input.fulfillment)) {
    if (pricing.kitFee === null) {
      return unpricedResult({
        tier,
        metalId,
        selectedToothCount,
        unitPricesUsd,
        metalAdjustUsd: metalAdj,
        platingFeeCents,
        toothSubtotalCents: regularToothSubtotalCents,
        regularToothSubtotalCents,
        foundingDiscountCents,
        afterDiscountCents,
        minimumApplied,
        kitFeeCents: null,
      });
    }
    kitFeeCents = usdToCents(pricing.kitFee);
  }

  /**
   * Kit credited to balance: customer total = grill price only.
   * Deposit = deposit% of grill + kit fee (front-loaded).
   * Balance = grill − deposit (kit effectively credited).
   * Local impressions: no kit fee.
   */
  const totalCents = pricing.kitCreditedToBalance
    ? afterDiscountCents
    : afterDiscountCents + kitFeeCents;
  const baseDeposit = Math.round((afterDiscountCents * pricing.depositPercent) / 100);
  const depositCents = pricing.kitCreditedToBalance
    ? baseDeposit + kitFeeCents
    : Math.round((totalCents * pricing.depositPercent) / 100);
  const balanceCents = totalCents - depositCents;

  const snapshot: PriceSnapshot = {
    appliedSpot,
    spotReference: pricing.metal.spotReference,
    unitPricesUsd,
    metalAdjustUsd: metalAdj,
    metalId,
    platingFeePerToothUsd: plateUsd,
    tier,
    foundingDiscountPercent:
      tier === 'founding' ? pricing.founding.discountPercent : null,
    kitFeeUsd: fulfillmentChargesKitFee(input.fulfillment) ? pricing.kitFee : 0,
    minimumOrderUsd: pricing.minimumOrder,
    frozenAt: new Date().toISOString(),
  };

  return {
    priced: true,
    quoteOnly: false,
    currency: pricing.currency,
    tier,
    metalId,
    platingFeePerToothUsd: plateUsd,
    platingFeeCents,
    unitPricesUsd,
    metalAdjustUsd: metalAdj,
    toothSubtotalCents: regularToothSubtotalCents,
    regularToothSubtotalCents,
    foundingDiscountCents,
    preMinimumCents,
    afterDiscountCents,
    minimumApplied,
    kitFeeCents,
    totalCents,
    depositCents,
    balanceCents,
    selectedToothCount,
    displayLabel: formatCents(totalCents),
    priceSnapshot: snapshot,
  };
}

export function formatCents(cents: number | null | undefined, currency = 'usd'): string {
  if (cents === null || cents === undefined) return 'Price on request';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatUsd(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

/** Admin margin: foundry + internal costs. */
export function estimateOrderCost(
  teeth: TeethMap,
  fulfillment: FulfillmentChoice,
  appliedSpot: number,
  totalCents: number | null,
) {
  let foundryUsd = 0;
  let missingFoundry = false;
  let toothCount = 0;

  for (const style of Object.values(teeth)) {
    if (!style || style === 'none') continue;
    if (!isPricedStyle(style)) continue;
    toothCount += 1;
    const c = foundryCostPerTooth(style, appliedSpot);
    if (c === null) missingFoundry = true;
    else foundryUsd += c;
  }

  const hasArch = toothCount > 0;
  const resin = hasArch ? costs.resinPerArchUsd : 0;
  const kit = fulfillmentChargesKitFee(fulfillment) ? costs.kitCostUsd : 0;
  const shipping = costs.shippingUsd;

  const parts: Array<number | null> = [
    missingFoundry ? null : foundryUsd,
    resin,
    kit,
    shipping,
  ];

  let stripeFee: number | null = null;
  if (
    totalCents != null &&
    costs.stripeFeeRate != null &&
    costs.stripeFeeFixedUsd != null
  ) {
    stripeFee = (totalCents / 100) * costs.stripeFeeRate + costs.stripeFeeFixedUsd;
    parts.push(stripeFee);
  }

  const totalCostUsd = parts.every((p) => p !== null)
    ? (parts as number[]).reduce((a, b) => a + b, 0)
    : null;

  const marginCents =
    totalCents != null && totalCostUsd != null
      ? totalCents - usdToCents(totalCostUsd)
      : null;

  return {
    foundryUsd: missingFoundry ? null : foundryUsd,
    resinUsd: resin,
    kitCostUsd: kit,
    shippingUsd: shipping,
    stripeFeeUsd: stripeFee,
    totalCostUsd,
    marginCents,
  };
}
