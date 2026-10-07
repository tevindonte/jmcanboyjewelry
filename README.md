# JMCANBOY Jewelry

Custom sterling silver grillz — Next.js App Router, Three.js builder, Supabase, Stripe, Resend.

Domain: **jmcanboyjewelry.com** · Brand: **JMCANBOY Jewelry**

## Setup

1. Copy `.env.example` → `.env.local` and fill keys.
2. Database:
   - Existing DB (even empty-ish from an older migrate): run `supabase/migrations/002_pricing_tiers.sql`
   - Brand-new project: `001_initial.sql` then `supabase/storage.sql`
3. Create a **private** Storage bucket named `mold-photos` (or run `storage.sql`).
4. Create one Supabase Auth user whose email matches `ADMIN_EMAIL`.
5. `npm install && npm run dev`
6. While `site_public` is false, open with `?preview=YOUR_PREVIEW_TOKEN` (sets a cookie).

## Silver spot (free Render)

Free Render has no reliable cron. **Primary path:** Admin → Pricing → type $/oz weekly and hit Save & apply.

Optional later: set `METALS_API_*` and hit `/api/cron/spot` from any scheduler (GitHub Action, etc.). Not required — a $20 spot move is only ~$1.50/tooth.

## Confirmed pricing

- Per tooth: $50 plain / $55 window / $60 deep cut
- Founding: first 5 paying public clients, 15% off
- Minimum order: $150 (after founding discount)
- Kit fee: $30 mail-only, in the deposit, credited so total = grill price; non-refundable once shipped
- Reference spot: $61.19/oz

## Scripts

- `npm run dev` / `npm run build` / `npm test` / `npm run lint`

## Swap the real GLB

```ts
// src/lib/model.config.ts
modelUrl: '/models/jmcanboy-arch.glb',
usePlaceholder: false,
```

## Still TODO(owner)

Grams per tooth, real foundry quote, metals API pick (optional), socials/TikTok/video, remake/refund policy, legal review, NY impression rules.
