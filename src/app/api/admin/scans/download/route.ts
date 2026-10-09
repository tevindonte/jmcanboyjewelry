import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { APPWRITE } from '@/lib/appwrite/ids';
import { verifyScanDownloadToken } from '@/lib/signed-download';

/** Short-lived signed download for private dentist scans (no public bucket read). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const payload = verifyScanDownloadToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Link expired or invalid' }, { status: 403 });
  }

  try {
    const { storage } = createAdminClient();
    const file = await storage.getFileDownload(APPWRITE.bucketScans, payload.fileId);
    const meta = await storage.getFile(APPWRITE.bucketScans, payload.fileId);
    const disposition = `attachment; filename="${payload.filename.replace(/"/g, '')}"`;
    return new NextResponse(Buffer.from(file), {
      headers: {
        'Content-Type': meta.mimeType || 'application/octet-stream',
        'Content-Disposition': disposition,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
