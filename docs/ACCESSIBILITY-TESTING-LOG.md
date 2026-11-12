# Accessibility testing log

Manual checks aimed at WCAG 2.2 Level AA / common ADA demand-letter triggers.  
Fill a **Results** row every time you test. Keep this file in the repo as remediation history.

Related public page: `/accessibility`  
Local site: http://localhost:3000 (or production URL)

---

## Results log

| Date | Tester | Browser / OS | Method | Pages / flow | Pass / Fail / Notes | Fixes after |
|------|--------|--------------|--------|--------------|---------------------|-------------|
| 2026-11-11 | Dev (Cursor) | Code review | Remediation pass | Sitewide + build + forms | Code landed; **human verify pending** | Skip link, focus, contrast, FAQ accordion, live regions, labels, touch targets, statement |
| | | Edge or Chrome / Windows | Keyboard-only | `/` → `/build` → waitlist or checkout | | |
| | | Edge or Chrome / Windows | 200% zoom | Home, build, kit, checkout | | |
| | | Windows + Narrator or NVDA | Screen reader | Forms, FAQ, tooth chart, errors | | |
| | | Any | Stripe Checkout | Deposit redirect (hosted) | | |

Copy a blank row for each new session.

---

## Part 1 — Keyboard-only walkthrough

Unplug the mouse / leave the trackpad alone. Navigate from the homepage through `/build` and checkout or waitlist.

**Keys**

| Key | Action |
|-----|--------|
| Tab | Forward through links, buttons, fields |
| Shift + Tab | Backward |
| Enter or Space | Activate buttons, checkboxes, FAQ items |
| Arrow keys | Radio groups (fulfillment / mold path) |
| Escape | Close popups / menus (if any open) |

**Checks**

- [ ] **Skip link:** First Tab shows “Skip to main content”; Enter jumps past the header to main content
- [ ] **Visible focus ring:** Always see which control is focused
- [ ] **No keyboard traps:** Can Tab into and out of 3D toolbar, tooth chart, forms
- [ ] **Modals / drawers:** If any open, Escape closes them and focus returns to the opener (site has few/none today — N/A is OK if none appear)

**Flow path to exercise**

1. `/` — skip link, header, FAQ accordion (Enter/Space expands/collapses)
2. `/build` — arch / metal radios, style buttons, tooth chart, Clear all, estimate, email + primary CTA
3. Waitlist **or** `/checkout` — fields, fulfillment radios, terms, submit with a blank required field to see error focus

---

## Part 2 — Zoom and visual checks

Chrome or Edge on Windows; no extra tools needed.

**200% zoom**

- [ ] Ctrl + `+` until zoom is **200%**
- [ ] Scroll home, `/build`, `/kit`, checkout/waitlist — no clipped text, no overlapping buttons, no forced horizontal scroll for main copy
- [ ] Ctrl + `0` to reset to 100%

**Image alt text**

- [ ] Inspect meaningful `<img>` tags — they have a real `alt="…"`
- [ ] Decorative icons use `alt=""` or are `aria-hidden` (SVGs in the builder are mostly `aria-hidden`)

---

## Part 3 — Screen reader (Windows)

**Setup**

- Narrator: `Win + Ctrl + Enter` (toggle on/off)
- Or install [NVDA](https://www.nvaccess.org/) (common for web a11y testing)

**Listen for**

- [ ] Form fields announce their **label** (e.g. “Email, edit”)
- [ ] FAQ buttons announce **expanded / collapsed**
- [ ] Submit with a blank required field — error is announced without hunting
- [ ] Tooth chart: tooth id / style and selected vs not selected
- [ ] Changing teeth or metal — live summary / estimate updates are announced

---

## Part 4 — After each session

1. Fill a row in **Results log** above (date, browser, pass/fail, notes).
2. If something failed, list the fix in **Fixes after** (or open an issue / commit message).
3. Confirm `/accessibility` contact (`jmcanboy@gmail.com` / business phone) is monitored.

**Stripe note:** Card payment uses **Stripe Checkout** (hosted). Document that payment-page a11y is Stripe’s; our job is a clear handoff button and working forms before redirect.

---

## Spreadsheet copy (optional)

Import `docs/accessibility-testing-log.csv` into Excel/Google Sheets if you prefer a spreadsheet over Markdown.
