import { NextResponse } from 'next/server';
import { getDoc, col } from '@/lib/db';

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
    teeth: JSON.parse(String(data.teeth_json ?? '{}')),
    estimate_cents: data.estimate_cents,
    created_at: data.$createdAt,
  });
}
