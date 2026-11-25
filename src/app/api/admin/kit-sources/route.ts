import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getKitSources, saveKitSources } from '@/lib/kit-sources';

const entrySchema = z.object({
  id: z.enum(['large', 'medium', 'walmart_backup']),
  url: z.string().max(2000).optional(),
  seenPriceUsd: z.number().min(0).nullable().optional(),
  deliveryNote: z.string().max(500).optional(),
  sellerNote: z.string().max(500).optional(),
  notes: z.string().max(4000).optional(),
  label: z.string().max(120).optional(),
});

const patchSchema = z.object({
  entries: z.array(entrySchema).min(1).max(10),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  return NextResponse.json({ sources: await getKitSources() });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const sources = await saveKitSources(parsed.data.entries);
  return NextResponse.json({ sources });
}
