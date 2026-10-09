export const siteConfig = {
  brandName: 'JMCANBOY Jewelry',
  domain: 'jmcanboyjewelry.com',
  tagline: 'Custom sterling silver grillz. Built to fit your mold.',
  location: 'New Rochelle, NY',
  termsVersion: '2026-01-draft',
  /** Spots a confirmed referral moves you up. */
  referralBoostSpots: 3,
  /** Max mold photos per order. */
  moldPhotoCount: 3,
  moldPhotoMaxBytes: 10 * 1024 * 1024,
  /** Accepted on upload; server converts all to JPEG before Appwrite storage. */
  moldPhotoMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ] as const,
  socials: {
    /** TODO(owner) */
    tiktok: null as string | null,
    instagram: null as string | null,
    twitter: null as string | null,
  },
  /** TODO(owner) supply TikTok embed/video URLs */
  tiktokClips: [] as string[],
  /** TODO(owner) impression tutorial video URL */
  impressionVideoUrl: null as string | null,
  contactEmail: 'hello@jmcanboyjewelry.com',
} as const;

export type SiteMode = 'waitlist' | 'preorder' | 'closed';
