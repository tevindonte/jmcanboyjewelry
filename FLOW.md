# Customer flow (waitlist vs preorder)

## Before (audit)

### Waitlist (`site_mode=waitlist`)

| # | Step |
|---|---|
| 1 | `/build` — pick teeth / metal |
| 2 | Enter email → **Save & get link** |
| 3 | Click **Join the waitlist** |
| 4 | `/waitlist` — enter name, email again, optional phone |
| 5 | Submit → position + referral link |

**Clicks / forms:** ~5 steps, email asked twice.

### Preorder (`site_mode=preorder`)

| # | Step |
|---|---|
| 1 | `/build` — pick teeth / metal |
| 2 | Enter email → **Save & get link** |
| 3 | Click **Reserve your slot** |
| 4 | `/checkout` — name, email again, phone, fulfillment, shipping (if kit), terms, founding consent |
| 5 | Stripe Checkout → pay deposit |
| 6 | Order link (mold / scan / shipping follow-up) |

**Clicks / forms:** ~6–7 steps before money, email twice, shipping before pay.

---

## After (this change)

### Waitlist

| # | Step |
|---|---|
| 1 | `/build` — pick teeth / metal |
| 2 | Enter email → **Join the waitlist** (saves design + joins in one action) |
| 3 | Done: share link + waitlist position on the same panel |

**Clicks / forms:** **2** (design + one email). No checkout UI. `/checkout` redirects to `/build` with a friendly note.

### Preorder

| # | Step |
|---|---|
| 1 | `/build` — pick teeth / metal |
| 2 | Enter email → **Reserve your slot** (saves design, opens checkout once) |
| 3 | `/checkout` — email prefilled; name; fulfillment; terms (+ founding consent). No shipping yet. |
| 4 | Stripe → pay deposit |
| 5 | Order email / `/order/{token}` — mold photos, dentist scan, kit shipping address |

**Clicks / forms:** **3** to payment (design → reserve → pay). Email once. Shipping / mold / scan after pay.

### Friends (public stays waitlist)

Admin **Create order** (optional manual price) → **Send payment link** emails a Stripe deposit URL while the public site stays waitlist-only.

---

## Guards

- Zero teeth: blocked at save / waitlist join / checkout with “Pick at least one tooth…”
- Under $150 minimum: clear message with how many more plain teeth reach it
- Specific API error strings (not “Invalid checkout data”)
