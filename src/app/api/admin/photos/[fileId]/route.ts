import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/appwrite/admin';
import { APPWRITE } from '@/lib/appwrite/ids';

/** Short-lived admin file proxy — mold photos stay in a private bucket. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { fileId } = await params;
  try {
    const { storage } = createAdminClient();
    const file = await storage.getFileView(APPWRITE.bucketMoldPhotos, fileId);
    const meta = await storage.getFile(APPWRITE.bucketMoldPhotos, fileId);
    return new NextResponse(Buffer.from(file), {
      headers: {
        'Content-Type': meta.mimeType || 'application/octet-stream',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
