import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { orderStatusSchema } from '@/lib/validations';
import { estimateOrderCost, type TeethMap } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';
import { sendMoldReviewResult } from '@/lib/email';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const settings = await getSettings();

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: design } = await supabase
    .from('designs')
    .select('*')
    .eq('id', order.design_id)
    .single();

  const { data: events } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  const { data: photos } = await supabase
    .from('mold_photos')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  const signed = [];
  for (const photo of photos ?? []) {
    const { data: signedUrl } = await supabase.storage
      .from('mold-photos')
      .createSignedUrl(photo.storage_path, 60 * 10);
    signed.push({ ...photo, url: signedUrl?.signedUrl ?? null });
  }

  const snapSpot =
    (order.price_snapshot as { appliedSpot?: number } | null)?.appliedSpot ??
    settings.applied_spot;

  const cost = design
    ? estimateOrderCost(
        design.teeth as TeethMap,
        order.fulfillment,
        snapSpot,
        order.total_cents,
      )
    : null;

  return NextResponse.json({
    order,
    design,
    events: events ?? [],
    photos: signed,
    cost,
    marginCents: cost?.marginCents ?? null,
  });
}

const patchSchema = z.object({
  status: orderStatusSchema.optional(),
  tracking_number: z.string().max(120).optional().nullable(),
  note: z.string().max(2000).optional(),
  markBalancePaidInPerson: z.boolean().optional(),
  deleteCustomerData: z.boolean().optional(),
  /** Waive founding media consent requirement (admin). */
  waiveMediaConsent: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.deleteCustomerData) {
    const { data: photos } = await supabase
      .from('mold_photos')
      .select('storage_path')
      .eq('order_id', id);
    for (const p of photos ?? []) {
      await supabase.storage.from('mold-photos').remove([p.storage_path]);
    }
    await supabase.from('mold_photos').delete().eq('order_id', id);
    await supabase.from('order_events').delete().eq('order_id', id);
    await supabase.from('orders').delete().eq('id', id);
    if (order.design_id) {
      await supabase.from('designs').delete().eq('id', order.design_id);
    }
    return NextResponse.json({ deleted: true });
  }

  if (parsed.data.waiveMediaConsent) {
    await supabase
      .from('orders')
      .update({ media_consent_at: new Date().toISOString() })
      .eq('id', id);
    await supabase.from('order_events').insert({
      order_id: id,
      type: 'media_consent_waived',
      note: parsed.data.note ?? 'Admin waived media consent',
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.markBalancePaidInPerson) {
    if (!parsed.data.note?.trim()) {
      return NextResponse.json({ error: 'Note required' }, { status: 400 });
    }
    await supabase.from('orders').update({ status: 'balance_paid' }).eq('id', id);
    await supabase.from('order_events').insert({
      order_id: id,
      type: 'balance_paid_in_person',
      note: parsed.data.note,
    });
    return NextResponse.json({ ok: true });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.tracking_number !== undefined) {
    updates.tracking_number = parsed.data.tracking_number;
  }

  if (Object.keys(updates).length) {
    await supabase.from('orders').update(updates).eq('id', id);
  }

  if (parsed.data.status) {
    await supabase.from('order_events').insert({
      order_id: id,
      type: parsed.data.status,
      note: parsed.data.note ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}

const photoReviewSchema = z.object({
  photoId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  note: z.string().max(2000).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = photoReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabase
    .from('mold_photos')
    .update({
      status: parsed.data.status,
      reviewer_note: parsed.data.note ?? null,
    })
    .eq('id', parsed.data.photoId)
    .eq('order_id', id);

  if (parsed.data.status === 'approved') {
    await supabase.from('orders').update({ status: 'mold_photos_approved' }).eq('id', id);
    await supabase.from('order_events').insert({
      order_id: id,
      type: 'mold_photos_approved',
      note: parsed.data.note ?? null,
    });
  }

  try {
    await sendMoldReviewResult({
      to: order.email,
      name: order.name,
      approved: parsed.data.status === 'approved',
      note: parsed.data.note,
      accessToken: order.access_token,
    });
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ ok: true });
}
