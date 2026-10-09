# Appwrite setup (JMCANBOY Jewelry)

Use [Appwrite Cloud](https://cloud.appwrite.io) or self-hosted. Create a project, then:

## 1. API key

Overview → Integrations → API keys. Scopes:

- `databases.read`, `databases.write`
- `collections.read`, `collections.write` (or tables equivalents if your console uses Tables)
- `documents.read`, `documents.write`
- `files.read`, `files.write`
- `sessions.write`, `users.read`

## 2. Database

Create database with ID: `jmcanboy` (or set `APPWRITE_DATABASE_ID`).

### Collections (document IDs = collection IDs below)

Permissions: **no public access** — only the API key (server) reads/writes.

#### `settings`
| Attr | Type | Required |
|---|---|---|
| value_json | string (size 4096) | yes |

Seed documents (custom IDs):

| Document ID | value_json |
|---|---|
| site_mode | `"waitlist"` |
| site_public | `false` |
| founding_slots_total | `5` |
| applied_spot | `61.19` |

#### `waitlist_entries`
| Attr | Type | Indexes |
|---|---|---|
| email | string 254, unique | unique |
| name | string 120 | |
| phone | string 40 | |
| referral_code | string 32, unique | unique |
| referred_by | string 32 | key |
| unsubscribe_token | string 64, unique | unique |
| unsubscribed_at | string 40, optional | |
| notified_at | string 40, optional | |

#### `designs`
| Attr | Type |
|---|---|
| email | string 254 |
| arch | string 16 (`top`/`bottom`/`both`) |
| teeth_json | string 20000 |
| estimate_cents | integer |

#### `orders`
| Attr | Type | Indexes |
|---|---|---|
| access_token | string 64, unique | unique |
| design_id | string 36 | key |
| email | string 254 | key |
| name | string 120 | |
| phone | string 40 | |
| fulfillment | string 32 | |
| status | string 40 | key |
| tier | string 16 | key |
| price_override_cents | integer | |
| media_consent_at | string 40 | |
| total_cents | integer | |
| deposit_cents | integer | |
| balance_cents | integer | |
| stripe_deposit_session_id | string 128 | |
| stripe_balance_session_id | string 128 | |
| price_snapshot_json | string 20000 | |
| terms_version | string 40 | |
| terms_accepted_at | string 40 | |
| terms_accepted_ip | string 64 | |
| shipping_address_json | string 2000 | |
| tracking_number | string 120 | |
| scan_file_id | string 64 | |
| scan_filename | string 255 | |
| scan_size_bytes | integer | |
| scan_uploaded_at | string 40 | |
| scan_status | string 32 (`received` / `approved` / `needs_new_scan` / empty) | |

#### `order_events`
| Attr | Type | Indexes |
|---|---|---|
| order_id | string 36 | key |
| type | string 64 | |
| note | string 2000 | |

#### `mold_photos`
| Attr | Type | Indexes |
|---|---|---|
| order_id | string 36 | key |
| storage_path | string 64 | |
| status | string 16 | |
| reviewer_note | string 2000 | |

#### `stripe_webhook_events`
| Attr | Type |
|---|---|
| type | string 128 | |

Use Stripe event id as the document `$id` for idempotency.

#### `spot_prices`
| Attr | Type |
|---|---|
| usd_per_oz | float |
| source | string 64 |
| fetched_at | string 40 |

## 3. Storage buckets

### `mold-photos`

Create bucket ID: `mold-photos`  
- **File security**: enabled  
- **Permissions**: none for guests (server API key only)  
- Max file size: 10 MB  
- **Allowed extensions** (console may ask for extensions, not MIME types):  
  `jpg`, `jpeg`, `png`  
- The app converts HEIC / WebP / PNG uploads to **JPEG** before storing, so admin photo review works in browsers (iPhone HEIC is not displayable in most browsers).

### `scans`

Create bucket ID: `scans` (or set `APPWRITE_BUCKET_SCANS`)  
- **File security**: enabled  
- **Permissions**: none for guests (server API key only — no public read)  
- Max file size: **50,000,000 bytes** (keep in sync with `siteConfig.dentistScan.maxBytes`)  
- **Allowed extensions**: `stl`, `obj`, `ply`  
- Used for optional dentist 3D scans on the order mold step.

Appwrite Cloud free tier often allows only **one** storage bucket. If creating `scans` fails with a plan limit, either upgrade or temporarily set `APPWRITE_BUCKET_SCANS` to your existing private bucket ID and add `stl`, `obj`, `ply` to that bucket’s allowed extensions (still API-key only — no public read).

## 4. Admin user

Auth → Users → create user with email = `ADMIN_EMAIL` and a strong password. Use that to sign in at `/admin/login`.

## 5. Env vars

See `.env.example` (`NEXT_PUBLIC_APPWRITE_*`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`).

## 6. Automated schema (recommended)

After the empty database + 8 tables exist (or even partially filled):

```bash
# .env.local must have endpoint, project ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID
npm run setup:appwrite
```

This is idempotent: creates missing columns/indexes, seeds settings if absent, then verifies. Never deletes data. Does not touch storage or auth.
