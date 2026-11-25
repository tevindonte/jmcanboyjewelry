import { NextResponse } from 'next/server';
import { saveDesignSchema } from '@/lib/validations';
import { calculateEstimate } from '@/lib/pricing';
import { normalizeMetalId, isQuoteOnlyMetal } from '@/lib/pricing.config';
import { getSettings, resolvePublicTier } from '@/lib/settings';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createDoc, col } from '@/lib/db';
import { formatBallparkRange, serializeCustomJson } from '@/lib/custom-request';
import { calculateBallparkEstimate } from '@/lib/quote';

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`designs:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveDesignSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? 'Invalid design' },
      { status: 400 },
    );
  }
  if (parsed.data.honeypot) {
    return NextResponse.json({ ok: true, id: 'ok', url: '/' });
  }

  const metal = normalizeMetalId(parsed.data.metal);
  const customRequest = Boolean(parsed.data.customRequest);
  const settings = await getSettings();
  const tier = await resolvePublicTier();
  const estimate = calculateEstimate({
    arch: parsed.data.arch,
    teeth: parsed.data.teeth,
    fulfillment: 'local_impression',
    tier,
    appliedSpot: settings.applied_spot,
    metal,
  });

  const toothCount = estimate.selectedToothCount;
  if (!customRequest && toothCount === 0) {
    return NextResponse.json(
      { error: 'Select at least one tooth before saving.' },
      { status: 400 },
    );
  }

  const quoteContact = (parsed.data.quoteContact ?? '').trim();
  const ballpark =
    !customRequest && (metal === 'gold' || metal === 'platinum')
      ? calculateBallparkEstimate({
          metal,
          teeth: parsed.data.teeth,
          goldKarat: parsed.data.goldKarat ?? 10,
        })
      : null;
  const custom_json = serializeCustomJson({
    enabled: customRequest,
    notes: parsed.data.customNotes ?? '',
    referenceUrl: parsed.data.customReferenceUrl ?? '',
    contactHandle: quoteContact,
    ...(ballpark
      ? {
          ballpark: {
            low: ballpark.low,
            high: ballpark.high,
            metal: ballpark.metal,
            configVersion: ballpark.configVersion,
          },
        }
      : {}),
  });

  const quoteOnly = customRequest || isQuoteOnlyMetal(metal) || estimate.quoteOnly;
  const metalLabel =
    ballpark?.metal === 'gold10k'
      ? 'gold 10k'
      : ballpark?.metal === 'gold14k'
        ? 'gold 14k'
        : metal;

  try {
    const doc = await createDoc(col.designs, {
      email: parsed.data.email.toLowerCase(),
      arch: parsed.data.arch,
      teeth_json: JSON.stringify(parsed.data.teeth),
      metal,
      estimate_cents: quoteOnly ? 0 : (estimate.totalCents ?? 0),
      custom_json,
    });

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const designUrl = `${base}/d/${doc.$id}`;

    if (quoteOnly) {
      try {
        const teethEntries = Object.entries(parsed.data.teeth)
          .filter(([, s]) => s && s !== 'none')
          .map(([id, s]) => `${id}:${s}`)
          .sort();
        const { notifyAdmin, designPublicPath } = await import('@/lib/admin-notify');
        await notifyAdmin({
          eventType: 'quote_request',
          entityId: doc.$id,
          subject: `Quote request · ${metalLabel} · ${parsed.data.email}`,
          summaryLines: [
            `Customer email: ${parsed.data.email.toLowerCase()}`,
            quoteContact ? `TikTok / phone: ${quoteContact}` : 'TikTok / phone: (none)',
            `Metal: ${metalLabel}`,
            ballpark
              ? `Ballpark shown: ${formatBallparkRange(ballpark.low, ballpark.high)} (${ballpark.metal}, config ${ballpark.configVersion})`
              : 'Ballpark shown: (none)',
            `Arch: ${parsed.data.arch}`,
            `Teeth: ${teethEntries.length ? teethEntries.join(', ') : '(custom / none listed)'}`,
            customRequest
              ? `Custom notes: ${(parsed.data.customNotes ?? '').trim() || '(none)'}`
              : 'Custom notes: (n/a)',
            parsed.data.customReferenceUrl
              ? `Reference: ${parsed.data.customReferenceUrl}`
              : '',
          ].filter(Boolean),
          linkPath: designPublicPath(doc.$id),
        });
      } catch (e) {
        console.error('quote admin notify', e);
      }
      try {
        const { sendQuoteRequestAck } = await import('@/lib/email');
        await sendQuoteRequestAck({ to: parsed.data.email.toLowerCase() });
      } catch (e) {
        console.error('quote customer ack', e);
      }
    }

    return NextResponse.json({
      id: doc.$id,
      url: designUrl,
      estimate_cents: quoteOnly ? null : estimate.totalCents,
      priced: quoteOnly ? false : estimate.priced,
      quoteOnly,
      customRequest,
      metal,
      tier,
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : String(e);
    const code =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code?: unknown }).code)
        : undefined;
    const type =
      e && typeof e === 'object' && 'type' in e
        ? String((e as { type?: unknown }).type)
        : undefined;

    let error = 'Could not save design';
    if (/paused|suspended|disabled/i.test(message)) {
      error =
        'Could not save design — Appwrite project looks paused or unavailable. Unpause it in the Appwrite console, then try again.';
    } else if (
      /unknown attribute|Invalid document structure|Attribute not found|custom_json|metal/i.test(
        message,
      )
    ) {
      error =
        'Could not save design — Appwrite designs table is missing a required column (metal and/or custom_json). Add them or run npm run setup:appwrite.';
    } else if (/Missing Appwrite|credentials|unauthorized|401|403/i.test(message)) {
      error =
        'Could not save design — Appwrite credentials on the server look wrong or missing. Check Render env vars.';
    } else if (/database_not_found|Database with the requested ID/i.test(message)) {
      error =
        'Could not save design — Appwrite database ID on the server does not match. Set APPWRITE_DATABASE_ID to your real database ID.';
    }

    return NextResponse.json(
      {
        error,
        detail: message.slice(0, 300),
        ...(code ? { code } : {}),
        ...(type ? { type } : {}),
      },
      { status: 500 },
    );
  }
}
