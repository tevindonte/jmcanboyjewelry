import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getDoc, updateDoc, col } from '@/lib/db';
import { normalizeMetalId } from '@/lib/pricing.config';
import {
  parseCustomJson,
  serializeCustomJson,
  type CustomRequestPayload,
  type FinalQuoteSnapshot,
} from '@/lib/custom-request';

const finalQuoteSchema = z.object({
  priceUsd: z.number().positive().max(1_000_000),
  notes: z.string().max(4000).default(''),
  inputs: z.object({
    metal: z.enum(['silver', 'gold10k', 'gold14k', 'platinum']),
    volumeCm3: z.number().positive(),
    teeth: z.number().int().positive(),
    spotPerTroyOz: z.number().positive().nullable(),
    targetMargin: z.number().min(0).max(0.9),
    foundryCastingUsd: z.number().min(0).nullable(),
    formulaPrice: z.number().positive(),
    styleSummary: z.string().max(200),
  }),
});

const patchSchema = z.object({
  finalQuote: finalQuoteSchema,
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const doc = await getDoc(col.designs, id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let teeth: Record<string, string> = {};
  try {
    teeth = JSON.parse(String(doc.teeth_json ?? '{}')) as Record<string, string>;
  } catch {
    teeth = {};
  }

  return NextResponse.json({
    id: doc.$id,
    email: doc.email,
    arch: doc.arch,
    metal: normalizeMetalId(doc.metal),
    teeth,
    estimate_cents: doc.estimate_cents,
    custom: parseCustomJson(doc.custom_json),
    created_at: doc.$createdAt,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const doc = await getDoc(col.designs, id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid final quote' }, { status: 400 });
  }

  const existing = parseCustomJson(doc.custom_json) ?? {
    enabled: false,
    notes: '',
    referenceUrl: '',
  };

  const finalQuote: FinalQuoteSnapshot = {
    priceUsd: parsed.data.finalQuote.priceUsd,
    notes: parsed.data.finalQuote.notes,
    savedAt: new Date().toISOString(),
    inputs: parsed.data.finalQuote.inputs,
  };

  const next: CustomRequestPayload = {
    ...existing,
    finalQuote,
  };

  await updateDoc(col.designs, id, {
    custom_json: serializeCustomJson(next),
  });

  return NextResponse.json({
    ok: true,
    custom: parseCustomJson(
      (await getDoc(col.designs, id))?.custom_json ?? serializeCustomJson(next),
    ),
  });
}
