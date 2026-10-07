import { NextResponse } from 'next/server';
import { waitlistSchema } from '@/lib/validations';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  computeWaitlistPosition,
  generateAccessToken,
  generateReferralCode,
} from '@/lib/referral';
import { sendWaitlistConfirmation } from '@/lib/email';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`waitlist:${ip}`, { limit: 8, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid signup' }, { status: 400 });
  }
  if (parsed.data.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  const email = parsed.data.email.toLowerCase();
  const referralCode = generateReferralCode();
  const unsubscribeToken = generateAccessToken();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  let referredBy: string | null = null;
  if (parsed.data.referralCode) {
    const { data: referrer } = await supabase
      .from('waitlist_entries')
      .select('referral_code')
      .eq('referral_code', parsed.data.referralCode)
      .is('unsubscribed_at', null)
      .maybeSingle();
    if (referrer) referredBy = referrer.referral_code;
  }

  const { data: existing } = await supabase
    .from('waitlist_entries')
    .select('id, referral_code')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    const position = await computeWaitlistPosition(existing.id);
    return NextResponse.json({
      id: existing.id,
      position,
      referralLink: `${base}/waitlist?ref=${existing.referral_code}`,
      alreadyJoined: true,
    });
  }

  const { data, error } = await supabase
    .from('waitlist_entries')
    .insert({
      email,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      referral_code: referralCode,
      referred_by: referredBy,
      unsubscribe_token: unsubscribeToken,
    })
    .select('id, referral_code, unsubscribe_token')
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: 'Could not join waitlist' }, { status: 500 });
  }

  const position = await computeWaitlistPosition(data.id);

  try {
    await sendWaitlistConfirmation({
      to: email,
      name: parsed.data.name,
      position,
      referralCode: data.referral_code,
      unsubscribeToken: data.unsubscribe_token,
    });
  } catch (e) {
    console.error('waitlist email failed', e);
  }

  return NextResponse.json({
    id: data.id,
    position,
    referralLink: `${base}/waitlist?ref=${data.referral_code}`,
    alreadyJoined: false,
  });
}
