import { NextResponse } from 'next/server';

/** Lightweight wake/ping target — no DB. Prefer this over /robots.txt on free Render. */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
