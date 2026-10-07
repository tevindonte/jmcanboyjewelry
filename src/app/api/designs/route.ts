import { NextResponse } from 'next/server';
import { saveDesignSchema } from '@/lib/validations';
import { calculateEstimate } from '@/lib/pricing';
import { getSettings, resolvePublicTier } from '@/lib/settings';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createDoc, col } from '@/lib/db';

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`designs:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveDesignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid design' }, { status: 400 });
  }
  if (parsed.data.honeypot) {
    return NextResponse.json({ ok: true, id: 'ok', url: '/' });
  }

  const settings = await getSettings();
  const tier = await resolvePublicTier();
  const estimate = calculateEstimate({
    arch: parsed.data.arch,
    teeth: parsed.data.teeth,
    fulfillment: 'local_impression',
    tier,
    appliedSpot: settings.applied_spot,
  });

  try {
    const doc = await createDoc(col.designs, {
      email: parsed.data.email.toLowerCase(),
      arch: parsed.data.arch,
      teeth_json: JSON.stringify(parsed.data.teeth),
      estimate_cents: estimate.totalCents ?? 0,
    });

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    return NextResponse.json({
      id: doc.$id,
      url: `${base}/d/${doc.$id}`,
      estimate_cents: estimate.totalCents,
      priced: estimate.priced,
      tier,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Could not save design' }, { status: 500 });
  }
}
