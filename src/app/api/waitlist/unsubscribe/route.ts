import { NextResponse } from 'next/server';
import { findOne, updateDoc, col, Query } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/?unsubscribed=0', request.url));
  }

  const entry = await findOne(col.waitlist, [Query.equal('unsubscribe_token', token)]);
  if (entry && !entry.unsubscribed_at) {
    await updateDoc(col.waitlist, entry.$id, {
      unsubscribed_at: new Date().toISOString(),
    });
  }

  return NextResponse.redirect(new URL('/?unsubscribed=1', request.url));
}
