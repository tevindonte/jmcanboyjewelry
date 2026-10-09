import sharp from 'sharp';
import convert from 'heic-convert';

const ACCEPT = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

/** Empty MIME is common on some phones — sniff from filename. */
export function normalizeImageMime(mime: string, filename: string): string {
  const lower = (mime || '').toLowerCase();
  if (ACCEPT.has(lower)) return lower === 'image/jpg' ? 'image/jpeg' : lower;

  const name = filename.toLowerCase();
  if (name.endsWith('.heic') || name.endsWith('.heif')) return 'image/heic';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return lower;
}

export function isAllowedUploadMime(mime: string): boolean {
  return ACCEPT.has(mime);
}

/**
 * Convert any accepted upload to JPEG for Appwrite (bucket allows jpg/jpeg/png only).
 * HEIC from iPhones is converted so admin review works in browsers.
 */
export async function toStoredJpeg(
  input: Buffer,
  mime: string,
): Promise<{ buffer: Buffer; filename: string; contentType: 'image/jpeg' }> {
  let raw = input;

  if (mime === 'image/heic' || mime === 'image/heif') {
    const out = await convert({
      buffer: input,
      format: 'JPEG',
      quality: 0.88,
    });
    raw = Buffer.from(out);
  }

  const buffer = await sharp(raw)
    .rotate() // honor EXIF orientation
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return {
    buffer,
    filename: 'mold.jpg',
    contentType: 'image/jpeg',
  };
}
