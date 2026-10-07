import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getLatestSpot, getSettings, setSettings, recordSpot } from '@/lib/settings';
import { pendingAdjustments, formatUsd } from '@/lib/pricing';
import { pricing } from '@/lib/pricing.config';
import { getMetalsProvider } from '@/lib/metals/provider';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const settings = await getSettings();
  const latest = await getLatestSpot();
  const candidate = latest?.usd_per_oz ?? settings.applied_spot;
  const pending = pendingAdjustments(candidate);
  const atApplied = pendingAdjustments(settings.applied_spot);

  return NextResponse.json({
    reference: pricing.metal.spotReference,
    applied: settings.applied_spot,
    latest,
    pending,
    atApplied,
    perToothBase: pricing.perTooth,
    passThrough: pricing.metal.passThrough,
    foundry: pricing.metal.foundry,
    gramsPerTooth: pricing.metal.gramsPerTooth,
    minimumOrder: pricing.minimumOrder,
    kitFee: pricing.kitFee,
    providerConfigured: Boolean(getMetalsProvider()),
    labels: {
      plain: formatUsd(atApplied.plain.unitUsd),
      window: formatUsd(atApplied.window.unitUsd),
      deepcut: formatUsd(atApplied.deepcut.unitUsd),
    },
  });
}

const applySchema = z.object({
  spot: z.number().positive().optional(),
  useLatest: z.boolean().optional(),
  applyNow: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  let spot = parsed.data.spot;
  if (parsed.data.useLatest && spot == null) {
    const latest = await getLatestSpot();
    if (!latest) {
      return NextResponse.json({ error: 'No latest spot to apply' }, { status: 400 });
    }
    spot = latest.usd_per_oz;
  }

  if (spot == null) {
    return NextResponse.json({ error: 'Provide spot or useLatest' }, { status: 400 });
  }

  await recordSpot(
    spot,
    parsed.data.spot != null ? 'admin_manual' : 'admin_apply_latest',
  );

  const applyNow = parsed.data.applyNow !== false;
  let applied = (await getSettings()).applied_spot;
  if (applyNow) {
    const settings = await setSettings({ applied_spot: spot });
    applied = settings.applied_spot;
  }

  return NextResponse.json({
    recorded: spot,
    applied_spot: applied,
    applied: applyNow,
  });
}
