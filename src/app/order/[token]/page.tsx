import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { OrderClient } from '@/components/OrderClient';

export const metadata = { title: 'Your order' };

export default async function OrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-silver-bright">Your order</h1>
        <p className="mt-2 text-sm text-text-muted">
          Magic link. No account needed. Bookmark this page.
        </p>
        <div className="mt-8">
          <OrderClient token={token} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
