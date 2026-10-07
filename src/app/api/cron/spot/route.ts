import { NextResponse } from 'next/server';
import { getSettings, setSettings, recordSpot } from '@/lib/settings';
import { shouldRepriceAppliedSpot } from '@/lib/pricing';
import { pricing } from '@/lib/pricing.config';
import { getMetalsProvider } from '@/lib/metals/provider';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const provider = getMetalsProvider();
  if (!provider) {
    return NextResponse.json({
      ok: false,
      mode: 'manual',
      message:
        'No METALS_API_URL configured. Use admin Pricing to enter spot manually (recommended on free Render).',
      applied_spot: (await getSettings()).applied_spot,
      reference: pricing.metal.spotReference,
    });
  }

  let quote;
  try {
    quote = await provider.fetchSpot();
  } catch (e) {
    console.error('spot fetch failed', e);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }

  if (!quote) {
    return NextResponse.json({ error: 'Invalid provider response' }, { status: 502 });
  }

  await recordSpot(quote.usdPerOz, quote.source);

  const settings = await getSettings();
  let applied = settings.applied_spot;
  let autoApplied = false;

  if (shouldRepriceAppliedSpot(quote.usdPerOz, settings.applied_spot)) {
    await setSettings({ applied_spot: quote.usdPerOz });
    applied = quote.usdPerOz;
    autoApplied = true;
  }

  return NextResponse.json({
    ok: true,
    latest: quote.usdPerOz,
    applied_spot: applied,
    autoApplied,
    source: quote.source,
  });
}
