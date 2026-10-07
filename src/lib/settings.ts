import { pricing } from './pricing.config';
import type { SiteMode } from './site.config';
import {
  getAllSettings,
  setSetting,
  listDocs,
  col,
  Query,
  createDoc,
  findOne,
} from './db';

export type AppSettings = {
  site_mode: SiteMode;
  site_public: boolean;
  founding_slots_total: number;
  applied_spot: number;
};

const defaults: AppSettings = {
  site_mode: 'waitlist',
  site_public: false,
  founding_slots_total: pricing.founding.slots,
  applied_spot: pricing.metal.spotReference,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const map = await getAllSettings();
    return {
      site_mode: (map.site_mode as SiteMode) ?? defaults.site_mode,
      site_public:
        typeof map.site_public === 'boolean' ? map.site_public : defaults.site_public,
      founding_slots_total:
        typeof map.founding_slots_total === 'number'
          ? map.founding_slots_total
          : defaults.founding_slots_total,
      applied_spot:
        typeof map.applied_spot === 'number'
          ? map.applied_spot
          : Number(map.applied_spot) || defaults.applied_spot,
    };
  } catch {
    return defaults;
  }
}

export async function setSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  for (const [key, value] of Object.entries(partial)) {
    await setSetting(key, value);
  }
  return getSettings();
}

export async function getFoundingSlotsRemaining(): Promise<{
  remaining: number;
  total: number;
}> {
  const settings = await getSettings();
  const total = settings.founding_slots_total;
  try {
    const { total: used } = await listDocs(col.orders, [
      Query.equal('tier', 'founding'),
      Query.notEqual('status', 'pending_deposit'),
      Query.notEqual('status', 'cancelled'),
      Query.notEqual('status', 'refunded'),
      Query.limit(1),
    ]);
    return { remaining: Math.max(0, total - used), total };
  } catch {
    return { remaining: total, total };
  }
}

export async function resolvePublicTier(): Promise<'founding' | 'standard'> {
  const { remaining } = await getFoundingSlotsRemaining();
  return remaining > 0 && pricing.founding.enabled ? 'founding' : 'standard';
}

export async function getLatestSpot(): Promise<{
  usd_per_oz: number;
  fetched_at: string;
  source: string;
} | null> {
  try {
    const doc = await findOne(col.spotPrices, [
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ]);
    if (!doc) return null;
    return {
      usd_per_oz: Number(doc.usd_per_oz),
      fetched_at: String(doc.$createdAt ?? doc.fetched_at ?? ''),
      source: String(doc.source ?? 'manual'),
    };
  } catch {
    return null;
  }
}

export async function recordSpot(usdPerOz: number, source: string) {
  await createDoc(col.spotPrices, {
    usd_per_oz: usdPerOz,
    source,
    fetched_at: new Date().toISOString(),
  });
}
