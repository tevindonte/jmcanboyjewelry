import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { sendLaunchEmail } from '@/lib/email';
import { listDocs, updateDoc, col, Query } from '@/lib/db';

const BATCH = 20;

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { documents: entries } = await listDocs(col.waitlist, [
    Query.isNull('unsubscribed_at'),
    Query.isNull('notified_at'),
    Query.orderAsc('$createdAt'),
    Query.limit(BATCH),
  ]);

  let sent = 0;
  for (const entry of entries) {
    try {
      await sendLaunchEmail({
        to: String(entry.email),
        name: String(entry.name),
        unsubscribeToken: String(entry.unsubscribe_token),
      });
      await updateDoc(col.waitlist, entry.$id, {
        notified_at: new Date().toISOString(),
      });
      sent += 1;
    } catch (e) {
      console.error('launch email', entry.email, e);
    }
  }

  const { total: remaining } = await listDocs(col.waitlist, [
    Query.isNull('unsubscribed_at'),
    Query.isNull('notified_at'),
    Query.limit(1),
  ]);

  return NextResponse.json({ sent, remaining });
}
