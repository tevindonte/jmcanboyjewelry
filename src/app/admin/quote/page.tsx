import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { AdminQuoteCalculator } from '@/components/admin/AdminQuoteCalculator';

export const metadata = { title: 'Quote calculator' };

export default async function AdminQuotePage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect('/admin/login');

  return (
    <>
      <div className="border-b border-border px-4 py-3">
        <Link href="/admin" className="text-sm text-steel hover:text-silver">
          ← Admin
        </Link>
      </div>
      <AdminQuoteCalculator />
    </>
  );
}
