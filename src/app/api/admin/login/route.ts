import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/appwrite/admin';
import { SESSION_COOKIE } from '@/lib/appwrite/ids';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`admin-login:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail || parsed.data.email.toLowerCase() !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { account } = createAdminClient();
    const session = await account.createEmailPasswordSession(
      parsed.data.email,
      parsed.data.password,
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(session.expire),
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
