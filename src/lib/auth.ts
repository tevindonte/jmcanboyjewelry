import { cookies } from 'next/headers';
import { createSessionClient } from '@/lib/appwrite/admin';
import { SESSION_COOKIE } from '@/lib/appwrite/ids';

export async function requireAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail) {
    return { ok: false as const, error: 'ADMIN_EMAIL not configured' };
  }

  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (!session) {
      return { ok: false as const, error: 'Unauthorized' };
    }

    const { account } = createSessionClient(session);
    const user = await account.get();
    if (!user.email || user.email.toLowerCase() !== adminEmail) {
      return { ok: false as const, error: 'Unauthorized' };
    }

    return { ok: true as const, user };
  } catch {
    return { ok: false as const, error: 'Unauthorized' };
  }
}
