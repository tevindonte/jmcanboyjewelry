import { NextResponse } from 'next/server';
import { waitlistSchema } from '@/lib/validations';
import {
  computeWaitlistPosition,
  generateAccessToken,
  generateReferralCode,
  findWaitlistByEmail,
  findWaitlistByReferral,
} from '@/lib/referral';
import { sendWaitlistConfirmation } from '@/lib/email';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createDoc, col } from '@/lib/db';

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

  const email = parsed.data.email.toLowerCase();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  let referredBy: string | null = null;
  if (parsed.data.referralCode) {
    const referrer = await findWaitlistByReferral(parsed.data.referralCode);
    if (referrer) referredBy = String(referrer.referral_code);
  }

  const existing = await findWaitlistByEmail(email);
  if (existing) {
    const position = await computeWaitlistPosition(existing.$id);
    return NextResponse.json({
      id: existing.$id,
      position,
      referralLink: `${base}/waitlist?ref=${existing.referral_code}`,
      alreadyJoined: true,
    });
  }

  try {
    const referralCode = generateReferralCode();
    const unsubscribeToken = generateAccessToken();
    const data = await createDoc(col.waitlist, {
      email,
      name: parsed.data.name,
      phone: parsed.data.phone ?? '',
      referral_code: referralCode,
      referred_by: referredBy ?? '',
      unsubscribe_token: unsubscribeToken,
    });

    const position = await computeWaitlistPosition(data.$id);

    try {
      await sendWaitlistConfirmation({
        to: email,
        name: parsed.data.name,
        position,
        referralCode,
        unsubscribeToken,
      });
    } catch (e) {
      console.error('waitlist email failed', e);
    }

    return NextResponse.json({
      id: data.$id,
      position,
      referralLink: `${base}/waitlist?ref=${referralCode}`,
      alreadyJoined: false,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Could not join waitlist' }, { status: 500 });
  }
}
