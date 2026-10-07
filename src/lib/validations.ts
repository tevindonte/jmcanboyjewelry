import { z } from 'zod';

export const toothStyleSchema = z.enum(['none', 'plain', 'window', 'deepcut']);
export const archSchema = z.enum(['top', 'bottom', 'both']);
export const toothIdSchema = z.string().regex(/^[UL][1-8]$/);

export const teethMapSchema = z.record(toothIdSchema, toothStyleSchema);

export const saveDesignSchema = z.object({
  email: z.string().email().max(254),
  arch: archSchema,
  teeth: teethMapSchema,
  honeypot: z.string().max(0).optional().or(z.literal('')),
});

export const waitlistSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(120),
  phone: z.string().max(40).optional().nullable(),
  referralCode: z.string().max(32).optional().nullable(),
  honeypot: z.string().max(0).optional().or(z.literal('')),
});

export const depositCheckoutSchema = z.object({
  designId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  phone: z.string().max(40).optional().nullable(),
  fulfillment: z.enum(['kit_mail', 'local_impression']),
  termsAccepted: z.literal(true),
  /** Required for founding-tier public checkout. */
  mediaConsent: z.boolean().optional(),
  shippingAddress: z
    .object({
      line1: z.string().min(1).max(200),
      line2: z.string().max(200).optional(),
      city: z.string().min(1).max(100),
      state: z.string().min(2).max(40),
      postal_code: z.string().min(3).max(20),
      country: z.string().length(2).default('US'),
    })
    .optional()
    .nullable(),
  honeypot: z.string().max(0).optional().or(z.literal('')),
});

export const orderTierSchema = z.enum(['founding', 'friend', 'standard']);

export const siteModeSchema = z.enum(['waitlist', 'preorder', 'closed']);

export const updateSettingsSchema = z.object({
  site_mode: siteModeSchema.optional(),
  site_public: z.boolean().optional(),
  founding_slots_total: z.number().int().min(0).max(1000).optional(),
  applied_spot: z.number().positive().optional(),
});

export const adminCreateOrderSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  phone: z.string().max(40).optional().nullable(),
  arch: archSchema,
  teeth: teethMapSchema,
  fulfillment: z.enum(['kit_mail', 'local_impression']),
  tier: orderTierSchema,
  priceOverrideCents: z.number().int().positive().optional().nullable(),
  markDepositPaid: z.boolean().optional(),
  markBalancePaid: z.boolean().optional(),
  note: z.string().min(1).max(2000),
  shippingAddress: z
    .object({
      line1: z.string().min(1).max(200),
      city: z.string().min(1).max(100),
      state: z.string().min(2).max(40),
      postal_code: z.string().min(3).max(20),
      country: z.string().length(2).default('US'),
    })
    .optional()
    .nullable(),
});


export const orderStatusSchema = z.enum([
  'pending_deposit',
  'deposit_paid',
  'kit_shipped',
  'impression_scheduled',
  'mold_photos_pending',
  'mold_photos_approved',
  'mold_received',
  'designing',
  'casting',
  'final_photos_sent',
  'balance_paid',
  'shipped',
  'cancelled',
  'refunded',
]);
