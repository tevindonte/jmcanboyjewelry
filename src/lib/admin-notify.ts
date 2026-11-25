/**
 * Admin notification emails (Resend). Failures are logged; callers must not fail the request.
 * Dedupes by eventType + entityId via settings rows (hashed id).
 */
import { createHash } from 'node:crypto';
import { createDoc, getDoc, col } from '@/lib/db';
import { siteConfig } from '@/lib/site.config';

export type AdminNotifyEvent =
  | 'quote_request'
  | 'deposit_paid'
  | 'kit_shipping'
  | 'mold_uploaded'
  | 'balance_paid';

const PRIVATE_URL_RE =
  /\/api\/admin\/photos\/|signed|X-Appwrite-Signature|whsec_|sk_live|sk_test|card\s*number|cvv|cvc/i;

export function adminNotifyRecipient(): string | null {
  const fromEnv = process.env.ADMIN_EMAIL?.trim();
  if (fromEnv) return fromEnv.toLowerCase();
  const fallback = siteConfig.contactEmail?.trim();
  return fallback ? fallback.toLowerCase() : null;
}

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function adminOrderPath(orderId: string): string {
  return `/admin/orders/${orderId}`;
}

export function designPublicPath(designId: string): string {
  return `/d/${designId}`;
}

export function notifyClaimId(eventType: string, entityId: string): string {
  // Appwrite custom IDs max 36 chars — hash keeps event+entity unique and short.
  const h = createHash('sha256')
    .update(`${eventType}:${entityId}`)
    .digest('hex')
    .slice(0, 32);
  return `n_${h}`;
}

/** Returns true if this process claimed the slot (should send). False if already sent. */
export async function claimAdminNotify(
  eventType: string,
  entityId: string,
): Promise<boolean> {
  const id = notifyClaimId(eventType, entityId);
  const existing = await getDoc(col.settings, id);
  if (existing) return false;
  try {
    await createDoc(
      col.settings,
      {
        value_json: JSON.stringify({
          eventType,
          entityId,
          at: new Date().toISOString(),
        }),
      },
      id,
    );
    return true;
  } catch {
    return false;
  }
}

export function buildAdminNotifyBody(opts: {
  summaryLines: string[];
  linkUrl: string;
  linkLabel: string;
}): string {
  const lines = [...opts.summaryLines, '', `${opts.linkLabel}: ${opts.linkUrl}`];
  return lines.join('\n');
}

export function adminNotifyContainsPrivateData(body: string): boolean {
  return PRIVATE_URL_RE.test(body);
}

export function formatAdminSubject(rest: string): string {
  const clean = rest.replace(/^\[JMCANBOY\]\s*/i, '').trim();
  return `[JMCANBOY] ${clean}`;
}

type SendEmailFn = (opts: {
  to: string;
  subject: string;
  text: string;
}) => Promise<void>;

let sendImpl: SendEmailFn | null = null;

/** Test hook — inject a fake sender. */
export function setAdminNotifySenderForTests(fn: SendEmailFn | null) {
  sendImpl = fn;
}

async function defaultSend(opts: { to: string; subject: string; text: string }) {
  const { sendAdminNotifyEmail } = await import('@/lib/email');
  await sendAdminNotifyEmail(opts);
}

/**
 * Claim + send. Never throws. Returns whether an email was attempted/sent.
 */
export async function notifyAdmin(opts: {
  eventType: AdminNotifyEvent;
  entityId: string;
  subject: string;
  summaryLines: string[];
  linkPath: string;
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    const to = adminNotifyRecipient();
    if (!to) {
      console.error('admin notify skipped: no ADMIN_EMAIL / contact email');
      return { sent: false, reason: 'no_recipient' };
    }

    const claimed = await claimAdminNotify(opts.eventType, opts.entityId);
    if (!claimed) {
      return { sent: false, reason: 'deduped' };
    }

    const linkUrl = `${siteBaseUrl()}${opts.linkPath.startsWith('/') ? '' : '/'}${opts.linkPath}`;
    const text = buildAdminNotifyBody({
      summaryLines: opts.summaryLines,
      linkUrl,
      linkLabel: 'Open in admin / site',
    });

    if (adminNotifyContainsPrivateData(text)) {
      console.error('admin notify blocked: private data in body', opts.eventType, opts.entityId);
      return { sent: false, reason: 'private_data' };
    }

    const send = sendImpl ?? defaultSend;
    await send({
      to,
      subject: formatAdminSubject(opts.subject),
      text,
    });
    return { sent: true };
  } catch (e) {
    console.error('admin notify failed', opts.eventType, opts.entityId, e);
    return { sent: false, reason: 'error' };
  }
}

export function fulfillmentLabel(fulfillment: string): string {
  if (fulfillment === 'kit_mail') return 'mail kit';
  if (fulfillment === 'local_impression') return 'local impression';
  if (fulfillment === 'dentist_scan') return 'dentist scan';
  return fulfillment || 'unknown';
}

export function formatCentsPlain(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(Number(cents))) return 'n/a';
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

export type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  tray_size?: 'large' | 'medium';
};

export function parseShippingAddressJson(raw: unknown): ShippingAddress | null {
  if (raw == null || raw === '') return null;
  try {
    const o =
      typeof raw === 'string'
        ? (JSON.parse(raw) as Record<string, unknown>)
        : (raw as Record<string, unknown>);
    if (typeof o.line1 !== 'string' || !o.line1.trim()) return null;
    const tray =
      o.tray_size === 'large' || o.tray_size === 'medium' ? o.tray_size : undefined;
    return {
      line1: String(o.line1),
      line2: typeof o.line2 === 'string' ? o.line2 : undefined,
      city: String(o.city ?? ''),
      state: String(o.state ?? ''),
      postal_code: String(o.postal_code ?? ''),
      country: String(o.country ?? 'US'),
      tray_size: tray,
    };
  } catch {
    return null;
  }
}

export function traySizeLabel(size: 'large' | 'medium' | undefined): string {
  if (size === 'medium') return 'Medium (smaller mouths)';
  if (size === 'large') return 'Large (most adults, default)';
  return 'not set';
}
