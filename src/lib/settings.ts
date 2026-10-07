import { createAdminClient } from './supabase/admin';
import type { SiteMode } from './site.config';
import { pricing } from './pricing.config';

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
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error || !data) return defaults;

    const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
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
  const supabase = createAdminClient();
  for (const [key, value] of Object.entries(partial)) {
    await supabase.from('settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });
  }
  return getSettings();
}

/** Founding slots from deposit-paid+ founding-tier orders only (not friend). */
export async function getFoundingSlotsRemaining(): Promise<{
  remaining: number;
  total: number;
}> {
  const settings = await getSettings();
  const total = settings.founding_slots_total;
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'founding')
      .neq('status', 'pending_deposit')
      .neq('status', 'cancelled')
      .neq('status', 'refunded');
    const used = count ?? 0;
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
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('spot_prices')
      .select('usd_per_oz, fetched_at, source')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      usd_per_oz: Number(data.usd_per_oz),
      fetched_at: data.fetched_at,
      source: data.source,
    };
  } catch {
    return null;
  }
}
