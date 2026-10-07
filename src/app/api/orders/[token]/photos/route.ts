import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { siteConfig } from '@/lib/site.config';
import { clientIp, rateLimit } from '@/lib/rate-limit';

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
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('access_token', token)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (order.status === 'pending_deposit') {
    return NextResponse.json({ error: 'Deposit required first' }, { status: 400 });
  }

  const { count } = await supabase
    .from('mold_photos')
    .select('*', { count: 'exact', head: true })
    .eq('order_id', order.id);

  if ((count ?? 0) >= siteConfig.moldPhotoCount) {
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

  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${order.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('mold-photos')
    .upload(path, buffer, { contentType: mime, upsert: false });

  if (uploadError) {
    console.error(uploadError);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: photo, error } = await supabase
    .from('mold_photos')
    .insert({
      order_id: order.id,
      storage_path: path,
      status: 'pending',
    })
    .select('id, status, created_at')
    .single();

  if (error || !photo) {
    return NextResponse.json({ error: 'Could not save photo' }, { status: 500 });
  }

  const newCount = (count ?? 0) + 1;
  if (newCount >= siteConfig.moldPhotoCount && order.status === 'deposit_paid') {
    await supabase
      .from('orders')
      .update({ status: 'mold_photos_pending' })
      .eq('id', order.id);
    await supabase.from('order_events').insert({
      order_id: order.id,
      type: 'mold_photos_pending',
      note: 'Customer uploaded mold photos',
    });
  }

  return NextResponse.json({ photo });
}
