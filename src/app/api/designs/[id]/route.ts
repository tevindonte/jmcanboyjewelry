import { NextResponse } from 'next/server';
import { getDoc, col } from '@/lib/db';
import { parseCustomJson } from '@/lib/custom-request';
import { normalizeMetalId } from '@/lib/pricing.config';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await getDoc(col.designs, id);
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: data.$id,
    arch: data.arch,
    metal: normalizeMetalId(data.metal),
    teeth: JSON.parse(String(data.teeth_json ?? '{}')),
    estimate_cents: data.estimate_cents,
    custom: parseCustomJson(data.custom_json),
    created_at: data.$createdAt,
  });
}
