/**
 * Internal-only costs for admin margin (alongside foundry math in pricing).
 * Kit/shipping/remake rates are owner guesses from profitability notes — not customer prices.
 */
export const costs = {
  /** Resin / print cost per arch in USD. TODO(owner) refine. */
  resinPerArchUsd: null as number | null,
  /** Kit materials + outbound postage guess (~$20). Not the $30 customer kit fee. */
  kitCostUsd: 20 as number | null,
  /** Finished-piece shipping guess. */
  shippingUsd: 7 as number | null,
  /** ~3% payment fees (Stripe-ish). */
  stripeFeeRate: 0.03 as number | null,
  stripeFeeFixedUsd: 0 as number | null,
  /** Rough remake rate for planning (1 in 4). Not charged to customers here. */
  remakeRate: 0.25 as number | null,
} as const;

export type CostsConfig = typeof costs;
