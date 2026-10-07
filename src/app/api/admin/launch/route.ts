import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendLaunchEmail } from '@/lib/email';

const BATCH = 20;

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const supabase = createAdminClient();
  const { data: entries } = await supabase
    .from('waitlist_entries')
    .select('id, email, name, unsubscribe_token')
    .is('unsubscribed_at', null)
    .is('notified_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH);

  let sent = 0;
  for (const entry of entries ?? []) {
    try {
      await sendLaunchEmail({
        to: entry.email,
        name: entry.name,
        unsubscribeToken: entry.unsubscribe_token,
      });
      await supabase
        .from('waitlist_entries')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', entry.id);
      sent += 1;
    } catch (e) {
      console.error('launch email', entry.email, e);
    }
  }

  const { count: remaining } = await supabase
    .from('waitlist_entries')
    .select('*', { count: 'exact', head: true })
    .is('unsubscribed_at', null)
    .is('notified_at', null);

  return NextResponse.json({ sent, remaining: remaining ?? 0 });
}
