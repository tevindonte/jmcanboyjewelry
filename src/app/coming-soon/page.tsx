import { siteConfig } from '@/lib/site.config';

export const metadata = {
  title: 'Coming soon',
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-xs font-semibold tracking-[0.2em] text-steel uppercase">
        {siteConfig.brandName}
      </p>
      <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-silver-bright sm:text-6xl">
        Coming soon
      </h1>
      <p className="mt-4 max-w-md text-text-muted">
        Custom sterling silver grillz. Private for now. Check back when we open slots.
      </p>
    </main>
  );
}
