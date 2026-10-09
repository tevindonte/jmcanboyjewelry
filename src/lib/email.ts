import { Resend } from 'resend';
import { siteConfig } from './site.config';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY');
  return new Resend(key);
}

function fromAddress() {
  return process.env.EMAIL_FROM ?? `${siteConfig.brandName} <orders@jmcanboyjewelry.com>`;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export async function sendWaitlistConfirmation(opts: {
  to: string;
  name: string;
  position: number;
  referralCode: string;
  unsubscribeToken: string;
}) {
  const resend = getResend();
  const referralLink = `${siteUrl()}/waitlist?ref=${opts.referralCode}`;
  const unsub = `${siteUrl()}/api/waitlist/unsubscribe?token=${opts.unsubscribeToken}`;

  await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `You're on the ${siteConfig.brandName} waitlist`,
    html: `
      <p>Hey ${opts.name},</p>
      <p>You're on the list. Right now you're around spot <strong>#${opts.position}</strong>.</p>
      <p>Share your link and each signup moves you up ${siteConfig.referralBoostSpots} spots:</p>
      <p><a href="${referralLink}">${referralLink}</a></p>
      <p style="color:#888;font-size:12px"><a href="${unsub}">Unsubscribe</a></p>
    `,
  });
}

export async function sendOrderConfirmation(opts: {
  to: string;
  name: string;
  accessToken: string;
  depositCents: number | null;
}) {
  const resend = getResend();
  const link = `${siteUrl()}/order/${opts.accessToken}`;
  const deposit =
    opts.depositCents != null
      ? `$${(opts.depositCents / 100).toFixed(0)}`
      : 'your deposit';

  await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `Deposit received · ${siteConfig.brandName}`,
    html: `
      <p>Hey ${opts.name},</p>
      <p>Got your deposit (${deposit}). Track your order and upload mold photos here:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Bookmark this link. You don't need an account.</p>
    `,
  });
}

export async function sendBalanceLink(opts: {
  to: string;
  name: string;
  checkoutUrl: string;
  accessToken: string;
}) {
  const resend = getResend();
  const orderLink = `${siteUrl()}/order/${opts.accessToken}`;

  await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `Balance due · ${siteConfig.brandName}`,
    html: `
      <p>Hey ${opts.name},</p>
      <p>Your piece is ready for the balance. Pay here:</p>
      <p><a href="${opts.checkoutUrl}">${opts.checkoutUrl}</a></p>
      <p>Order status: <a href="${orderLink}">${orderLink}</a></p>
    `,
  });
}

export async function sendMoldReviewResult(opts: {
  to: string;
  name: string;
  approved: boolean;
  note?: string | null;
  accessToken: string;
}) {
  const resend = getResend();
  const link = `${siteUrl()}/order/${opts.accessToken}`;

  await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: opts.approved
      ? `Mold photos approved · ${siteConfig.brandName}`
      : `Mold photos need a retake · ${siteConfig.brandName}`,
    html: `
      <p>Hey ${opts.name},</p>
      <p>${
        opts.approved
          ? 'Your mold photos look good. Next step is getting the physical mold in.'
          : 'Need a clearer set of mold photos.'
      }</p>
      ${opts.note ? `<p><em>${opts.note}</em></p>` : ''}
      <p><a href="${link}">View your order</a></p>
    `,
  });
}

export async function sendScanReviewResult(opts: {
  to: string;
  name: string;
  approved: boolean;
  reason?: string | null;
  accessToken: string;
}) {
  const resend = getResend();
  const link = `${siteUrl()}/order/${opts.accessToken}`;

  await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: opts.approved
      ? `Scan approved · ${siteConfig.brandName}`
      : `Need a new scan · ${siteConfig.brandName}`,
    html: `
      <p>Hey ${opts.name},</p>
      <p>${
        opts.approved
          ? 'Your dentist 3D scan looks good. We can start making your piece.'
          : 'We need a new dentist 3D scan for your order.'
      }</p>
      ${opts.reason ? `<p><strong>Reason:</strong> ${opts.reason}</p>` : ''}
      <p><a href="${link}">View your order</a></p>
    `,
  });
}

export async function sendLaunchEmail(opts: {
  to: string;
  name: string;
  unsubscribeToken: string;
}) {
  const resend = getResend();
  const unsub = `${siteUrl()}/api/waitlist/unsubscribe?token=${opts.unsubscribeToken}`;

  await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `Pre-orders are open · ${siteConfig.brandName}`,
    html: `
      <p>Hey ${opts.name},</p>
      <p>Slots are open. Build your grill and reserve yours:</p>
      <p><a href="${siteUrl()}/build">${siteUrl()}/build</a></p>
      <p style="color:#888;font-size:12px"><a href="${unsub}">Unsubscribe</a></p>
    `,
  });
}
