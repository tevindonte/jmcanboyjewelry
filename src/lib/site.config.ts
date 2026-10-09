export const siteConfig = {
  brandName: 'JMCANBOY Jewelry',
  domain: 'jmcanboyjewelry.com',
  tagline: 'Custom grillz. Silver now. Gold on request.',
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
    tiktok: 'https://www.tiktok.com/@solodatin',
    instagram: 'https://www.instagram.com/jmcanboyjewelry',
    twitter: null as string | null,
  },
  /** TODO(owner) supply TikTok embed/video URLs */
  tiktokClips: [] as string[],
  /** TODO(owner) impression tutorial video URL */
  impressionVideoUrl: null as string | null,
  contactEmail: 'jmcanboy@gmail.com',
  /** Google Voice business line */
  contactPhone: '8603517405',
  contactPhoneDisplay: '(860) 351-7405',
} as const;

export type SiteMode = 'waitlist' | 'preorder' | 'closed';
