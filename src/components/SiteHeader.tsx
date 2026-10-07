import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-display text-sm font-semibold tracking-[0.12em] text-silver-bright uppercase"
        >
          {siteConfig.brandName}
        </Link>
        <nav className="flex items-center gap-5 text-sm text-text-muted" aria-label="Main">
          <Link href="/build" className="hover:text-silver-bright transition-colors">
            Build
          </Link>
          <Link href="/kit" className="hover:text-silver-bright transition-colors">
            Kit
          </Link>
          <Link href="/waitlist" className="hover:text-silver-bright transition-colors">
            Waitlist
          </Link>
        </nav>
      </div>
    </header>
  );
}
