import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { getSettings, getFoundingSlotsRemaining } from '@/lib/settings';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function AdminPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect('/admin/login');

  const settings = await getSettings();
  const founding = await getFoundingSlotsRemaining();

  return (
    <AdminDashboard
      settings={settings}
      foundingRemaining={founding.remaining}
      foundingTotal={founding.total}
    />
  );
}
