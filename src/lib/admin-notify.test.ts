import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  createDoc: vi.fn(),
  col: { settings: 'settings' },
}));

vi.mock('@/lib/db', () => ({
  getDoc: mocks.getDoc,
  createDoc: mocks.createDoc,
  col: mocks.col,
}));

import {
  adminNotifyContainsPrivateData,
  buildAdminNotifyBody,
  claimAdminNotify,
  formatAdminSubject,
  notifyAdmin,
  notifyClaimId,
  setAdminNotifySenderForTests,
  traySizeLabel,
} from './admin-notify';

describe('admin-notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminNotifySenderForTests(null);
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jmcanboyjewelry.com';
  });

  it('dedupes: second claim for same event+entity returns false', async () => {
    mocks.getDoc.mockResolvedValueOnce(null);
    mocks.createDoc.mockResolvedValueOnce({ $id: 'n_1' });
    const first = await claimAdminNotify('deposit_paid', 'ord_abc');
    expect(first).toBe(true);

    mocks.getDoc.mockResolvedValueOnce({ $id: notifyClaimId('deposit_paid', 'ord_abc') });
    const second = await claimAdminNotify('deposit_paid', 'ord_abc');
    expect(second).toBe(false);
  });

  it('notifyAdmin skips send when already claimed (dedupe)', async () => {
    const send = vi.fn();
    setAdminNotifySenderForTests(send);
    mocks.getDoc.mockResolvedValue({ $id: 'already' });

    const result = await notifyAdmin({
      eventType: 'deposit_paid',
      entityId: 'ord_1',
      subject: 'Deposit paid',
      summaryLines: ['Customer: Test <t@example.com>', 'Amount: $150.00'],
      linkPath: '/admin/orders/ord_1',
    });

    expect(result).toEqual({ sent: false, reason: 'deduped' });
    expect(send).not.toHaveBeenCalled();
  });

  it('email failure does not throw — notifyAdmin returns sent false', async () => {
    mocks.getDoc.mockResolvedValue(null);
    mocks.createDoc.mockResolvedValue({ $id: 'n_ok' });
    setAdminNotifySenderForTests(async () => {
      throw new Error('Resend down');
    });

    const result = await notifyAdmin({
      eventType: 'balance_paid',
      entityId: 'ord_2',
      subject: 'Balance paid',
      summaryLines: ['Customer: Test <t@example.com>'],
      linkPath: '/admin/orders/ord_2',
    });

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('error');
  });

  it('built body has no private photo/scan URLs or secrets', () => {
    const body = buildAdminNotifyBody({
      summaryLines: [
        'Customer: Tevin <tev@example.com>',
        'Mold photos uploaded. Review in admin — no photo URLs in this email.',
        'Dentist scan uploaded. Download only from admin.',
      ],
      linkUrl: 'https://jmcanboyjewelry.com/admin/orders/ord_xyz',
      linkLabel: 'Open in admin / site',
    });

    expect(adminNotifyContainsPrivateData(body)).toBe(false);
    expect(body).not.toMatch(/\/api\/admin\/photos\//);
    expect(body).not.toMatch(/signed/i);
    expect(body).not.toMatch(/sk_live|sk_test|whsec_/);
    expect(body).toContain('/admin/orders/ord_xyz');
  });

  it('flags private URL patterns in a body', () => {
    expect(
      adminNotifyContainsPrivateData(
        'See https://x.com/api/admin/photos/file123 for the mold',
      ),
    ).toBe(true);
  });

  it('subject is prefixed with [JMCANBOY]', () => {
    expect(formatAdminSubject('Deposit paid · Ada')).toBe(
      '[JMCANBOY] Deposit paid · Ada',
    );
  });

  it('traySizeLabel covers large and medium', () => {
    expect(traySizeLabel('large')).toContain('Large');
    expect(traySizeLabel('medium')).toContain('Medium');
  });
});
