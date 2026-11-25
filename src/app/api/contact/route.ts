import { NextResponse } from 'next/server';
import { contactSchema } from '@/lib/validations';
import { sendContactMessage } from '@/lib/email';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`contact:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }
  if (parsed.data.honeypot) {
    return NextResponse.json({ ok: true });
  }

  try {
    await sendContactMessage({
      name: parsed.data.name.trim(),
      email: parsed.data.email.toLowerCase().trim(),
      message: parsed.data.message.trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('contact email failed', e);
    return NextResponse.json(
      { error: 'Could not send message. Email us directly instead.' },
      { status: 500 },
    );
  }
}
