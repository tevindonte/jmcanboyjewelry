-- Metal-indexed pricing + order tiers (run after 001_initial.sql)

-- Applied spot in settings
insert into public.settings (key, value) values
  ('applied_spot', '61.19'::jsonb),
  ('founding_slots_total', '5'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Spot price history
create table if not exists public.spot_prices (
  id uuid primary key default gen_random_uuid(),
  usd_per_oz numeric not null,
  fetched_at timestamptz not null default now(),
  source text not null default 'manual'
);

create index if not exists spot_prices_fetched_at_idx
  on public.spot_prices (fetched_at desc);

alter table public.spot_prices enable row level security;

create policy "spot_prices_no_public" on public.spot_prices
  for all using (false);

-- Order tier enum
do $$ begin
  create type public.order_tier as enum ('founding', 'friend', 'standard');
exception when duplicate_object then null;
end $$;

-- Migrate founding bool → tier if column exists
alter table public.orders
  add column if not exists tier public.order_tier;

-- Backfill from founding bool if present
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'founding'
  ) then
    update public.orders
    set tier = case when founding then 'founding'::public.order_tier else 'standard'::public.order_tier end
    where tier is null;
  end if;
end $$;

update public.orders set tier = 'standard' where tier is null;

alter table public.orders
  alter column tier set not null,
  alter column tier set default 'standard';

alter table public.orders
  add column if not exists price_override_cents integer,
  add column if not exists media_consent_at timestamptz,
  add column if not exists price_snapshot jsonb;

-- Drop old founding column if present
alter table public.orders drop column if exists founding;

create index if not exists orders_tier_idx on public.orders (tier);
