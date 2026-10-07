import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  if (!settings.site_public) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: `${base}/sitemap.xml`,
  };
}
