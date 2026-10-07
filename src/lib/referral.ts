import { customAlphabet } from 'nanoid';
import { siteConfig } from './site.config';
import { createAdminClient } from './supabase/admin';

const nano = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 8);

export function generateReferralCode() {
  return nano();
}

export function generateAccessToken() {
  return customAlphabet('abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 24)();
}

/**
 * Position = rank by created_at among active entries, then subtract
 * referralBoostSpots * confirmedReferralCount (floor at 1).
 */
export async function computeWaitlistPosition(entryId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, referral_code, created_at, unsubscribed_at')
    .eq('id', entryId)
    .single();

  if (!entry || entry.unsubscribed_at) return 0;

  const { data: all } = await supabase
    .from('waitlist_entries')
    .select('id, referral_code, created_at')
    .is('unsubscribed_at', null)
    .order('created_at', { ascending: true });

  if (!all) return 1;

  const codes = all.map((e) => e.referral_code);
  const { data: refs } = await supabase
    .from('waitlist_entries')
    .select('referred_by')
    .in('referred_by', codes)
    .is('unsubscribed_at', null);

  const refCounts = new Map<string, number>();
  for (const r of refs ?? []) {
    if (!r.referred_by) continue;
    refCounts.set(r.referred_by, (refCounts.get(r.referred_by) ?? 0) + 1);
  }

  const scored = all.map((e, index) => {
    const boost = (refCounts.get(e.referral_code) ?? 0) * siteConfig.referralBoostSpots;
    return {
      id: e.id,
      score: index + 1 - boost,
    };
  });

  scored.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  const rank = scored.findIndex((s) => s.id === entryId);
  return Math.max(1, rank + 1);
}
