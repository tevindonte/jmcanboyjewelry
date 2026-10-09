# JMCANBOY Jewelry

Custom sterling silver grillz — Next.js + Appwrite + Stripe + Resend.

Domain: **jmcanboyjewelry.com**

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- three.js (`@react-three/fiber` / `drei`)
- **Appwrite** — DB, Auth (admin), private Storage
- Stripe Checkout + webhooks
- Resend email
- Deploy on **Render** (free tier OK)

## Local setup

1. Copy `.env.example` → `.env.local` and fill values.
2. Follow **[appwrite/SETUP.md](appwrite/SETUP.md)** (database + 8 tables, bucket, admin user).
3. With `.env.local` filled: `npm run setup:appwrite` (idempotent columns/indexes/settings seed).
4. `npm install && npm run dev`
5. While private: open `http://localhost:3000/?preview=YOUR_PREVIEW_TOKEN`

## Deploy on Render (free)

Free web services **sleep when idle** — first hit after sleep is slow. No cron on free; enter silver spot in Admin → Pricing weekly.

### Option A — Blueprint

1. Push this repo to GitHub (already: `tevindonte/jmcanboyjewelry`).
2. [Render Dashboard](https://dashboard.render.com) → New → Blueprint → connect the repo (`render.yaml`).
3. Fill env vars marked `sync: false` (Appwrite, Stripe, Resend, `NEXT_PUBLIC_SITE_URL`, `PREVIEW_TOKEN`, `ADMIN_EMAIL`).
4. Deploy. Point `NEXT_PUBLIC_SITE_URL` at your `*.onrender.com` URL (or custom domain later).
5. Stripe webhook → `https://YOUR-SERVICE.onrender.com/api/webhooks/stripe`

### Option B — Manual web service

1. New → Web Service → this repo  
2. **Build:** `npm ci && npm run build`  
3. **Start:** `npm run start`  
4. **Node:** 22  
5. Add the same env vars as `.env.example`

### After deploy

1. Open `https://YOUR-SERVICE.onrender.com/?preview=PREVIEW_TOKEN`
2. `/admin/login` with the Appwrite user matching `ADMIN_EMAIL`
3. When ready: Admin → toggle `site_public`

## Confirmed pricing

$50 / $55 / $60 · founding 5 @ 15% · min $150 · kit $30 (credited) · spot ref $61.19

## Scripts

`npm run dev` · `npm run build` · `npm test` · `npm run lint`

## GLB swap

```ts
// src/lib/model.config.ts
modelUrl: '/models/jmcanboy-arch.glb',
usePlaceholder: false,
```
