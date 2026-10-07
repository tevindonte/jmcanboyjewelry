import { customAlphabet } from 'nanoid';
import { siteConfig } from './site.config';
import { listDocs, getDoc, findOne, col, Query } from './db';

const nano = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 8);

export function generateReferralCode() {
  return nano();
}

export function generateAccessToken() {
  return customAlphabet(
    'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
    24,
  )();
}

export async function computeWaitlistPosition(entryId: string): Promise<number> {
  const entry = await getDoc(col.waitlist, entryId);
  if (!entry || entry.unsubscribed_at) return 0;

  const { documents: all } = await listDocs(col.waitlist, [
    Query.isNull('unsubscribed_at'),
    Query.orderAsc('$createdAt'),
    Query.limit(5000),
  ]);

  const codes = all.map((e) => String(e.referral_code));
  const refCounts = new Map<string, number>();

  for (const code of codes) {
    const { total } = await listDocs(col.waitlist, [
      Query.equal('referred_by', code),
      Query.isNull('unsubscribed_at'),
      Query.limit(1),
    ]);
    refCounts.set(code, total);
  }

  const scored = all.map((e, index) => {
    const boost =
      (refCounts.get(String(e.referral_code)) ?? 0) * siteConfig.referralBoostSpots;
    return { id: e.$id, score: index + 1 - boost };
  });

  scored.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  const rank = scored.findIndex((s) => s.id === entryId);
  return Math.max(1, rank + 1);
}

export async function findWaitlistByEmail(email: string) {
  return findOne(col.waitlist, [Query.equal('email', email.toLowerCase())]);
}

export async function findWaitlistByReferral(code: string) {
  return findOne(col.waitlist, [
    Query.equal('referral_code', code),
    Query.isNull('unsubscribed_at'),
  ]);
}
