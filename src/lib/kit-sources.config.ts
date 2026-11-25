/**
 * Admin-only impression kit purchase sources.
 * Never surface seller/retailer names on customer-facing pages.
 */

export type TraySize = 'large' | 'medium';

export type KitSourceId = 'large' | 'medium' | 'walmart_backup';

export type KitSource = {
  id: KitSourceId;
  /** Admin label */
  label: string;
  /** When set, this entry is the buy link for that tray size */
  traySize?: TraySize;
  url: string;
  seenPriceUsd: number | null;
  deliveryNote: string;
  /** Admin-only seller/context notes — never show to customers */
  sellerNote: string;
  notes: string;
};

export const defaultKitSources: KitSource[] = [
  {
    id: 'large',
    label: 'Large kit (default)',
    traySize: 'large',
    url: 'https://www.ebay.com/itm/358900490371?var=626863986712',
    seenPriceUsd: 14.96,
    deliveryNote: 'Free 2–4 day delivery (as last checked)',
    sellerNote: 'Seller OROAX (99.8% positive) — admin only',
    notes:
      '2 putty sets + 1 pair Large trays. Price last checked 2026-11-24. Ship directly to customer address at checkout; use a gift or no-price slip if offered.',
  },
  {
    id: 'medium',
    label: 'Medium kit',
    traySize: 'medium',
    url: 'https://www.ebay.com/itm/358900490371?var=626863986711',
    seenPriceUsd: 14.96,
    deliveryNote: 'Free 2–4 day delivery (as last checked)',
    sellerNote: 'Seller OROAX (99.8% positive) — admin only',
    notes:
      '2 putty sets + 1 pair Medium trays. Price last checked 2026-11-24. Ship directly to customer address at checkout; use a gift or no-price slip if offered.',
  },
  {
    id: 'walmart_backup',
    label: 'Backup — Walmart NORZERO 2-set',
    url: '',
    seenPriceUsd: null,
    deliveryNote: '',
    sellerNote: 'Walmart NORZERO 2-set — fill URL when found',
    notes: 'Backup option. Add product URL when available.',
  },
];

export function mergeKitSources(
  overrides: Partial<KitSource>[] | null | undefined,
): KitSource[] {
  const byId = new Map(defaultKitSources.map((s) => [s.id, { ...s }]));
  if (Array.isArray(overrides)) {
    for (const row of overrides) {
      if (!row || typeof row !== 'object' || !row.id) continue;
      const base = byId.get(row.id as KitSourceId);
      if (!base) continue;
      byId.set(row.id as KitSourceId, {
        ...base,
        ...row,
        id: base.id,
        traySize: base.traySize,
        label: typeof row.label === 'string' && row.label.trim() ? row.label : base.label,
      });
    }
  }
  return defaultKitSources.map((d) => byId.get(d.id) ?? d);
}

/** Buy URL for a customer tray size (admin use). Falls back to large. */
export function kitBuyUrlForTray(
  tray: TraySize | undefined,
  sources: KitSource[] = defaultKitSources,
): string | null {
  const size = tray === 'medium' ? 'medium' : 'large';
  const match = sources.find((s) => s.traySize === size && s.url.trim());
  if (match?.url.trim()) return match.url.trim();
  const large = sources.find((s) => s.traySize === 'large' && s.url.trim());
  return large?.url.trim() || null;
}

export function kitBuyLabelForTray(tray: TraySize | undefined): string {
  if (tray === 'medium') return 'Buy this kit (Medium trays)';
  return 'Buy this kit (Large trays)';
}
