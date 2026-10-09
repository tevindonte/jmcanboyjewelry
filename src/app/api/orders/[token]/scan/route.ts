import { NextResponse } from 'next/server';
import { InputFile } from 'node-appwrite/file';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createAdminClient, ID } from '@/lib/appwrite/admin';
import { scanExtension, validateScanUpload } from '@/lib/scans';
import {
  findOne,
  updateDoc,
  createDoc,
  col,
  Query,
  APPWRITE,
} from '@/lib/db';

const emptyScanFields = {
  scan_file_id: '',
  scan_filename: '',
  scan_size_bytes: 0,
  scan_uploaded_at: '',
  scan_status: '',
};

async function deleteStoredScan(fileId: string) {
  if (!fileId) return;
  try {
    const { storage } = createAdminClient();
    await storage.deleteFile(APPWRITE.bucketScans, fileId);
  } catch {
    /* ignore missing */
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`scan:${ip}`, { limit: 10, windowMs: 60_000 });
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

  if (['shipped', 'cancelled', 'refunded'].includes(String(order.status))) {
    return NextResponse.json({ error: 'Order is closed' }, { status: 400 });
  }

  const form = await request.formData();
  if (form.get('company')) {
    return NextResponse.json({ ok: true });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const gate = validateScanUpload({
    filename: file.name,
    mime: file.type,
    size: file.size,
  });
  if (gate) {
    return NextResponse.json(gate, {
      status: gate.code === 'file_too_large' ? 413 : 400,
    });
  }

  const ext = scanExtension(file.name)!;

  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const bodyGate = validateScanUpload({
      filename: file.name,
      mime: file.type,
      size: raw.byteLength,
    });
    if (bodyGate) {
      return NextResponse.json(bodyGate, {
        status: bodyGate.code === 'file_too_large' ? 413 : 400,
      });
    }

    const prevId = String(order.scan_file_id || '');
    const { storage } = createAdminClient();
    const fileId = ID.unique();
    const safeName = file.name.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 200);
    const storedName = safeName.toLowerCase().endsWith(`.${ext}`)
      ? safeName
      : `${safeName}.${ext}`;
    const input = InputFile.fromBuffer(raw, storedName);

    await storage.createFile(APPWRITE.bucketScans, fileId, input);

    const uploadedAt = new Date().toISOString();
    await updateDoc(col.orders, order.$id, {
      fulfillment: 'dentist_scan',
      scan_file_id: fileId,
      scan_filename: storedName,
      scan_size_bytes: raw.byteLength,
      scan_uploaded_at: uploadedAt,
      scan_status: 'received',
      ...(order.status === 'deposit_paid' ? { status: 'mold_photos_pending' } : {}),
    });

    await createDoc(col.orderEvents, {
      order_id: order.$id,
      type: 'scan_received',
      note: `Dentist scan uploaded: ${storedName} (${raw.byteLength} bytes)`,
    });

    if (prevId && prevId !== fileId) {
      await deleteStoredScan(prevId);
    }

    return NextResponse.json({
      scan: {
        file_id: fileId,
        filename: storedName,
        size_bytes: raw.byteLength,
        uploaded_at: uploadedAt,
        status: 'received',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`scan-del:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { token } = await params;
  const order = await findOne(col.orders, [Query.equal('access_token', token)]);
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const fileId = String(order.scan_file_id || '');
  if (!fileId) {
    return NextResponse.json({ ok: true, deleted: false });
  }

  await deleteStoredScan(fileId);
  await updateDoc(col.orders, order.$id, emptyScanFields);
  await createDoc(col.orderEvents, {
    order_id: order.$id,
    type: 'scan_deleted',
    note: 'Customer deleted dentist scan',
  });

  return NextResponse.json({ ok: true, deleted: true });
}
