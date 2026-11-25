import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getDoc, col } from '@/lib/db';
import { normalizeMetalId } from '@/lib/pricing.config';
import { parseCustomJson } from '@/lib/custom-request';
import { AdminDesignQuotePanel } from '@/components/admin/AdminDesignQuotePanel';
import { designPublicPath } from '@/lib/admin-notify';

export const metadata = { title: 'Admin design quote' };

export default async function AdminDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) redirect('/admin/login');

  const { id } = await params;
  const doc = await getDoc(col.designs, id);
  if (!doc) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/admin" className="text-sm text-steel hover:text-silver">
          ← Admin
        </Link>
        <p className="mt-6 text-text-muted">Design not found.</p>
      </main>
    );
  }

  let teeth: Record<string, string> = {};
  try {
    teeth = JSON.parse(String(doc.teeth_json ?? '{}')) as Record<string, string>;
  } catch {
    teeth = {};
  }
  const custom = parseCustomJson(doc.custom_json);

  return (
    <>
      <div className="border-b border-border px-4 py-3">
        <Link href="/admin" className="text-sm text-steel hover:text-silver">
          ← Admin
        </Link>
      </div>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <h1 className="font-display text-2xl font-bold text-silver-bright">
            Quote request
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {String(doc.email)} · {normalizeMetalId(doc.metal)} · arch{' '}
            {String(doc.arch)}
            {custom?.contactHandle ? ` · ${custom.contactHandle}` : ''}
          </p>
          <p className="mt-2 text-sm">
            <a
              href={designPublicPath(doc.$id)}
              className="text-silver underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Public design link
            </a>
          </p>
          {custom?.enabled && (
            <div className="mt-4 rounded-md border border-border bg-bg-elevated p-3 text-sm">
              <p className="text-xs tracking-wide text-steel uppercase">
                Custom request
              </p>
              <p className="mt-2 whitespace-pre-wrap text-text-muted">
                {custom.notes || '(no notes)'}
              </p>
            </div>
          )}
        </div>

        <AdminDesignQuotePanel
          prefill={{
            designId: doc.$id,
            email: String(doc.email ?? ''),
            arch: String(doc.arch ?? 'top'),
            metalPublic: normalizeMetalId(doc.metal),
            teeth,
            ballpark: custom?.ballpark ?? null,
            finalQuote: custom?.finalQuote ?? null,
            customNotes: custom?.notes,
            contactHandle: custom?.contactHandle,
          }}
        />
      </main>
    </>
  );
}
