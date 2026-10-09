import { createHmac, timingSafeEqual } from 'crypto';

/** Short-lived signed download tokens for private scan files. */
const TTL_MS = 15 * 60 * 1000;

function secret(): string {
  return (
    process.env.SCAN_DOWNLOAD_SECRET ||
    process.env.APPWRITE_API_KEY ||
    process.env.CRON_SECRET ||
    'dev-scan-download-secret'
  );
}

export type ScanDownloadPayload = {
  fileId: string;
  filename: string;
  exp: number;
  sig: string;
};

export function createScanDownloadToken(fileId: string, filename: string): string {
  const exp = Date.now() + TTL_MS;
  const sig = createHmac('sha256', secret())
    .update(`${fileId}\0${filename}\0${exp}`)
    .digest('hex');
  const payload: ScanDownloadPayload = { fileId, filename, exp, sig };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function verifyScanDownloadToken(token: string): ScanDownloadPayload | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const payload = JSON.parse(raw) as ScanDownloadPayload;
    if (
      !payload?.fileId ||
      !payload?.filename ||
      typeof payload.exp !== 'number' ||
      typeof payload.sig !== 'string'
    ) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    const expected = createHmac('sha256', secret())
      .update(`${payload.fileId}\0${payload.filename}\0${payload.exp}`)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(payload.sig, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function scanDownloadUrl(fileId: string, filename: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const token = createScanDownloadToken(fileId, filename);
  return `${base}/api/admin/scans/download?token=${encodeURIComponent(token)}`;
}
