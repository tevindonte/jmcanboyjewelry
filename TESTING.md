# Stripe payment testing (local)

Prereqs: `npm run dev` on http://localhost:3000, Stripe CLI logged in, and

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` in `.env.local`, then restart Next.

Use the **Stripe Dashboard → Developers → test mode** event log alongside the CLI listener.

Automated checks: `npm test` (webhook signature/idempotency + deposit vs price snapshot).

---

## 1. Happy path (card `4242 4242 4242 4242`)

1. Set site mode to **preorder** in admin (if needed).
2. Open `/build`, pick teeth, save design, go to checkout.
3. Fill name/email, pick a fulfillment path, accept terms (and founding media consent if shown).
4. Click **Pay deposit** → Stripe Checkout.
5. Card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
6. Pay.

**Expect**

| Where | What |
|---|---|
| Site | Redirect to `/order/<token>?paid=1`. Status becomes **deposit paid** (after webhook). |
| Email | Deposit confirmation (if Resend is configured). |
| Admin | Order shows `deposit_paid`, deposit amount matches checkout. |
| Stripe test log | `checkout.session.completed` (and related payment events) succeeded. |
| CLI listener | `checkout.session.completed` → `200`. |

---

## 2. Declined card (`4000 0000 0000 0002`)

1. Same checkout flow to Stripe.
2. Use decline card `4000 0000 0000 0002`.

**Expect**

| Where | What |
|---|---|
| Site | Stripe shows a decline; you stay on Checkout / return cancelled. Order stays **pending deposit**. |
| Admin | Still `pending_deposit`. No confirmation email. |
| Founding slots | Not consumed (slot count only includes founding orders that left `pending_deposit`). |
| Stripe test log | Failed payment / incomplete session. No successful `checkout.session.completed` for that attempt. |

---

## 3. 3D Secure card (`4000 0025 0000 3155`)

1. Checkout as usual.
2. Card `4000 0025 0000 3155` → complete the 3DS challenge when prompted.

**Expect**

| Where | What |
|---|---|
| Site | After auth, same success as happy path (`deposit_paid` on order link). |
| Stripe test log | Authentication + `checkout.session.completed`. |
| CLI | Webhook `200`. |

---

## 4. Cash App Pay

1. On Stripe Checkout, choose **Cash App Pay** (enabled in deposit session).
2. Follow Stripe’s test Cash App flow (test mode simulated approval).

**Expect**

| Where | What |
|---|---|
| Site | Same success redirect and `deposit_paid` once webhook lands. |
| Stripe test log | Cash App payment + `checkout.session.completed`. |

---

## 5. Cancel / abandon

1. Start checkout, click back / cancel on Stripe (`cancel_url` → `/build?cancelled=1`).

**Expect:** order remains `pending_deposit`; no founding slot consumed; no confirmation email.

---

## 6. Webhook replay (idempotency)

1. In CLI or Dashboard, find a delivered `checkout.session.completed` event id.
2. Run: `stripe events resend evt_…`

**Expect:** listener returns success; order still `deposit_paid` once; no second confirmation email; founding slot count unchanged.

---

## Before going live

- [ ] Switch to **live** Stripe keys (`pk_live_…` / `sk_live_…`) only on the production host.
- [ ] Create a **production** webhook endpoint pointing at `https://<your-domain>/api/webhooks/stripe` for `checkout.session.completed` (and keep the signing secret in prod env as `STRIPE_WEBHOOK_SECRET`).
- [ ] Remove or disable the local CLI `whsec_` from production.
- [ ] Confirm `NEXT_PUBLIC_SITE_URL` is the real domain (success/cancel URLs).
- [ ] One real $1–deposit smoke test with a real card, then refund if needed.
- [ ] Confirm Resend `EMAIL_FROM` domain is verified.
- [ ] Confirm founding slot counts in admin after a paid founding order.
- [ ] Never commit `.env.local` (covered by `.env*.local` in `.gitignore`).
