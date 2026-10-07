import { createClient } from './supabase/server';

export async function requireAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail) {
    return { ok: false as const, error: 'ADMIN_EMAIL not configured' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || user.email.toLowerCase() !== adminEmail) {
    return { ok: false as const, error: 'Unauthorized' };
  }

  return { ok: true as const, user };
}
