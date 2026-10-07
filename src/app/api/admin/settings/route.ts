import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSettings, setSettings } from '@/lib/settings';
import { updateSettingsSchema } from '@/lib/validations';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  return NextResponse.json(await getSettings());
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const next = await setSettings(parsed.data);
  return NextResponse.json(next);
}
