import { NextResponse } from 'next/server';
import { InputFile } from 'node-appwrite/file';
import { siteConfig } from '@/lib/site.config';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createAdminClient, ID } from '@/lib/appwrite/admin';
import {
  findOne,
  listDocs,
  createDoc,
  updateDoc,
  col,
  Query,
  APPWRITE,
} from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`photos:${ip}`, { limit: 15, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { token } = await params;
  const order = await findOne(col.orders, [Query.equal('access_token', token)]);
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (order.status === 'pending_deposit') {
    return NextResponse.json({ error: 'Deposit required first' }, { status: 400 });
  }

  const { total: count } = await listDocs(col.moldPhotos, [
    Query.equal('order_id', order.$id),
    Query.limit(1),
  ]);

  if (count >= siteConfig.moldPhotoCount) {
    return NextResponse.json(
      { error: `Max ${siteConfig.moldPhotoCount} photos` },
      { status: 400 },
    );
  }

  const form = await request.formData();
  if (form.get('company')) {
    return NextResponse.json({ ok: true });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  if (file.size > siteConfig.moldPhotoMaxBytes) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  const mime = file.type;
  if (!(siteConfig.moldPhotoMimeTypes as readonly string[]).includes(mime)) {
    return NextResponse.json({ error: 'Images only' }, { status: 400 });
  }

  try {
    const { storage } = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = ID.unique();
    const input = InputFile.fromBuffer(buffer, file.name || `${fileId}.jpg`);

    await storage.createFile(APPWRITE.bucketMoldPhotos, fileId, input);

    const photo = await createDoc(col.moldPhotos, {
      order_id: order.$id,
      storage_path: fileId,
      status: 'pending',
      reviewer_note: '',
    });

    const newCount = count + 1;
    if (newCount >= siteConfig.moldPhotoCount && order.status === 'deposit_paid') {
      await updateDoc(col.orders, order.$id, { status: 'mold_photos_pending' });
      await createDoc(col.orderEvents, {
        order_id: order.$id,
        type: 'mold_photos_pending',
        note: 'Customer uploaded mold photos',
      });
    }

    return NextResponse.json({
      photo: { id: photo.$id, status: photo.status, created_at: photo.$createdAt },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
