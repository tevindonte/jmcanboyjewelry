import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/?unsubscribed=0', request.url));
  }

  const supabase = createAdminClient();
  await supabase
    .from('waitlist_entries')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .is('unsubscribed_at', null);

  return NextResponse.redirect(new URL('/?unsubscribed=1', request.url));
}
