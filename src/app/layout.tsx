import type { Metadata } from 'next';
import { DM_Sans, Syne } from 'next/font/google';
import { siteConfig } from '@/lib/site.config';
import { getSettings } from '@/lib/settings';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = `Custom grillz · ${siteConfig.brandName}`;
  const description = siteConfig.tagline;
  return {
    title: {
      default: title,
      template: `%s · ${siteConfig.brandName}`,
    },
    description,
    robots: settings.site_public
      ? { index: true, follow: true }
      : { index: false, follow: false },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    openGraph: {
      title,
      description,
      siteName: siteConfig.brandName,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="font-body text-text antialiased">{children}</body>
    </html>
  );
}
