/** Fixed Appwrite resource IDs — create these in the console (or setup script). */
export const APPWRITE = {
  databaseId: process.env.APPWRITE_DATABASE_ID ?? 'jmcanboy',
  bucketMoldPhotos: process.env.APPWRITE_BUCKET_MOLD_PHOTOS ?? 'mold-photos',
  collections: {
    settings: 'settings',
    waitlist: 'waitlist_entries',
    designs: 'designs',
    orders: 'orders',
    orderEvents: 'order_events',
    moldPhotos: 'mold_photos',
    stripeEvents: 'stripe_webhook_events',
    spotPrices: 'spot_prices',
  },
} as const;

export const SESSION_COOKIE = 'jmcanboy_session';
