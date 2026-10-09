import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';

export function SiteFooter() {
  const socials = [
    { label: 'TikTok', href: siteConfig.socials.tiktok },
    { label: 'Instagram', href: siteConfig.socials.instagram },
    { label: 'X', href: siteConfig.socials.twitter },
  ].filter((s) => s.href);

  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:justify-between">
        <div>
          <p className="font-display text-sm font-semibold tracking-[0.12em] text-silver-bright uppercase">
            {siteConfig.brandName}
          </p>
          <p className="mt-2 max-w-xs text-sm text-text-muted">
            Custom grillz. Silver now. Gold on request. {siteConfig.location}.
          </p>
          <p className="mt-3 space-y-1 text-sm text-text-muted">
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="block hover:text-silver"
            >
              {siteConfig.contactEmail}
            </a>
            <a
              href={`tel:+1${siteConfig.contactPhone}`}
              className="block hover:text-silver"
            >
              {siteConfig.contactPhoneDisplay}
            </a>
          </p>
          <p className="mt-1 text-xs text-steel-dim">{siteConfig.domain}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-text-muted">
          <Link href="/build" className="hover:text-silver">
            Build
          </Link>
          <Link href="/kit" className="hover:text-silver">
            Impression kit
          </Link>
          <Link href="/care" className="hover:text-silver">
            Care
          </Link>
          <Link href="/terms" className="hover:text-silver">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-silver">
            Privacy
          </Link>
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href!}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-silver"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
      <p className="border-t border-border px-4 py-4 text-center text-xs text-steel-dim">
        Cosmetic jewelry — not a dental or medical product.
      </p>
    </footer>
  );
}
