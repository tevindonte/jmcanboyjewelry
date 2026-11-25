import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateBallparkEstimate } from '@/lib/quote';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { teethMapSchema } from '@/lib/validations';

/**
 * Public ballpark for gold / platinum. Response body is ONLY { low, high }.
 * Never includes cost breakdown, labor, margin, casting rates, or spot.
 */
const estimateBodySchema = z.object({
  metal: z.enum(['gold', 'gold10k', 'gold14k', 'platinum', 'plating', 'silver']),
  teeth: teethMapSchema,
  /** Used when metal is generic "gold". Default 10k. */
  goldKarat: z.union([z.literal(10), z.literal(14)]).optional().default(10),
  /** Optional single style hint — ignored; volume comes from teeth map. */
  style: z.enum(['plain', 'window', 'deepcut']).optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`estimate:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ low: null, high: null }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = estimateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ low: null, high: null }, { status: 400 });
  }

  const band = calculateBallparkEstimate({
    metal: parsed.data.metal,
    teeth: parsed.data.teeth,
    goldKarat: parsed.data.goldKarat,
  });

  if (!band) {
    return NextResponse.json({ low: null, high: null });
  }

  return NextResponse.json({ low: band.low, high: band.high });
}
