-- JMCANBOY Jewelry schema (fresh install)
create extension if not exists "pgcrypto";

-- settings
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('site_mode', '"waitlist"'::jsonb),
  ('site_public', 'false'::jsonb),
  ('founding_slots_total', '5'::jsonb),
  ('applied_spot', '61.19'::jsonb)
on conflict (key) do nothing;

alter table public.settings enable row level security;
create policy "settings_no_public" on public.settings for all using (false);

-- spot_prices
create table if not exists public.spot_prices (
  id uuid primary key default gen_random_uuid(),
  usd_per_oz numeric not null,
  fetched_at timestamptz not null default now(),
  source text not null default 'manual'
);
create index if not exists spot_prices_fetched_at_idx on public.spot_prices (fetched_at desc);
alter table public.spot_prices enable row level security;
create policy "spot_prices_no_public" on public.spot_prices for all using (false);

-- waitlist
create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text,
  referral_code text not null unique,
  referred_by text,
  unsubscribe_token text not null unique,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  notified_at timestamptz
);
create index if not exists waitlist_entries_created_at_idx on public.waitlist_entries (created_at);
create index if not exists waitlist_entries_referred_by_idx on public.waitlist_entries (referred_by);
alter table public.waitlist_entries enable row level security;
create policy "waitlist_no_public" on public.waitlist_entries for all using (false);

-- designs
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  arch text not null check (arch in ('top', 'bottom', 'both')),
  teeth jsonb not null,
  estimate_cents integer,
  created_at timestamptz not null default now()
);
create index if not exists designs_email_idx on public.designs (email);
alter table public.designs enable row level security;
create policy "designs_no_public" on public.designs for all using (false);

-- orders
create type public.fulfillment_type as enum ('kit_mail', 'local_impression');
create type public.order_tier as enum ('founding', 'friend', 'standard');
create type public.order_status as enum (
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
  'refunded'
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  access_token text not null unique,
  design_id uuid not null references public.designs (id),
  email text not null,
  name text not null,
  phone text,
  fulfillment public.fulfillment_type not null,
  status public.order_status not null,
  tier public.order_tier not null default 'standard',
  price_override_cents integer,
  media_consent_at timestamptz,
  total_cents integer not null,
  deposit_cents integer not null,
  balance_cents integer not null,
  stripe_deposit_session_id text,
  stripe_balance_session_id text,
  price_snapshot jsonb,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  terms_accepted_ip text,
  shipping_address jsonb,
  tracking_number text,
  created_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_email_idx on public.orders (email);
create index if not exists orders_tier_idx on public.orders (tier);

alter table public.orders enable row level security;
create policy "orders_no_public" on public.orders for all using (false);

-- order_events
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  type text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_id_idx on public.order_events (order_id);
alter table public.order_events enable row level security;
create policy "order_events_no_public" on public.order_events for all using (false);

-- mold_photos
create type public.mold_photo_status as enum ('pending', 'approved', 'rejected');
create table if not exists public.mold_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  storage_path text not null,
  status public.mold_photo_status not null default 'pending',
  reviewer_note text,
  created_at timestamptz not null default now()
);
create index if not exists mold_photos_order_id_idx on public.mold_photos (order_id);
alter table public.mold_photos enable row level security;
create policy "mold_photos_no_public" on public.mold_photos for all using (false);

-- stripe webhook idempotency
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
create policy "stripe_webhook_events_no_public" on public.stripe_webhook_events for all using (false);
