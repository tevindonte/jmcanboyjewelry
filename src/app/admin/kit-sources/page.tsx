import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { AdminKitSourcesPanel } from '@/components/admin/AdminKitSourcesPanel';

export const metadata = { title: 'Kit sources' };

export default async function AdminKitSourcesPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect('/admin/login');

  return (
    <>
      <div className="border-b border-border px-4 py-3">
        <Link href="/admin" className="text-sm text-steel hover:text-silver">
          ← Admin
        </Link>
      </div>
      <AdminKitSourcesPanel />
    </>
  );
}
