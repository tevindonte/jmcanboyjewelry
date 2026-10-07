import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  if (!settings.site_public) return [];

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const paths = ['', '/build', '/waitlist', '/kit', '/terms', '/privacy', '/care'];

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
