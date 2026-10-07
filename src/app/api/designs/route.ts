import { NextResponse } from 'next/server';
import { saveDesignSchema } from '@/lib/validations';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateEstimate } from '@/lib/pricing';
import { getSettings, resolvePublicTier } from '@/lib/settings';
import { clientIp, rateLimit } from '@/lib/rate-limit';

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

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('designs')
    .insert({
      email: parsed.data.email.toLowerCase(),
      arch: parsed.data.arch,
      teeth: parsed.data.teeth,
      estimate_cents: estimate.totalCents,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: 'Could not save design' }, { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return NextResponse.json({
    id: data.id,
    url: `${base}/d/${data.id}`,
    estimate_cents: estimate.totalCents,
    priced: estimate.priced,
    tier,
  });
}
