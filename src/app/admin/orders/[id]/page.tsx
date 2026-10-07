import { redirect, notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { AdminOrderDetail } from '@/components/admin/AdminOrderDetail';

export const metadata = { title: 'Order', robots: { index: false, follow: false } };

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) redirect('/admin/login');
  const { id } = await params;
  if (!id) notFound();
  return <AdminOrderDetail orderId={id} />;
}
