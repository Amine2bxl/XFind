-- XFind — Supabase (PostgreSQL) schema
-- Mirrors the portable DDL in src/server/db/ddl.ts but adds Row Level Security.
-- Run this in the Supabase SQL editor, then apply src/server/.env values.

-- ------------------------------------------------------------------
-- users
-- ------------------------------------------------------------------
create table if not exists public.users (
  id text primary key,
  email text not null unique,
  password_hash text,
  name text,
  is_admin integer not null default 0,
  notification_settings text not null default '{}',
  created_at text not null,
  updated_at text not null
);

-- ------------------------------------------------------------------
-- sessions (local auth tokens; Supabase auth stores its own tokens too)
-- ------------------------------------------------------------------
create table if not exists public.sessions (
  token text primary key,
  user_id text not null references public.users(id) on delete cascade,
  created_at text not null,
  expires_at text not null
);
create index if not exists idx_sessions_user on public.sessions(user_id);

-- ------------------------------------------------------------------
-- brands
-- ------------------------------------------------------------------
create table if not exists public.brands (
  id text primary key,
  name text not null,
  normalized_name text not null,
  slug text not null unique,
  aliases text not null default '[]',
  image_url text,
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_brands_normalized on public.brands(normalized_name);

-- ------------------------------------------------------------------
-- categories (hierarchical)
-- ------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  parent_id text references public.categories(id) on delete set null,
  level integer not null default 0,
  created_at text not null
);

-- ------------------------------------------------------------------
-- models
-- ------------------------------------------------------------------
create table if not exists public.models (
  id text primary key,
  brand_id text references public.brands(id) on delete set null,
  name text not null,
  normalized_name text not null,
  aliases text not null default '[]',
  slug text not null,
  created_at text not null
);
create index if not exists idx_models_brand on public.models(brand_id);

-- ------------------------------------------------------------------
-- listings
-- ------------------------------------------------------------------
create table if not exists public.listings (
  id text primary key,
  external_id text not null,
  source text not null,
  source_url text not null,
  title text not null,
  description text,
  brand text,
  brand_id text,
  category text,
  category_id text,
  model text,
  model_id text,
  gender text,
  size text,
  size_normalized text,
  color text,
  condition text,
  price real not null default 0,
  currency text not null default 'EUR',
  images text not null default '[]',
  seller_id text,
  seller_name text,
  location text,
  published_at text,
  first_seen_at text not null,
  last_seen_at text not null,
  is_active integer not null default 1,
  relevance_data text,
  created_at text not null,
  updated_at text not null
);
create unique index if not exists uq_listings_source_external on public.listings(source, external_id);
create index if not exists idx_listings_brand_id on public.listings(brand_id);
create index if not exists idx_listings_category_id on public.listings(category_id);
create index if not exists idx_listings_model_id on public.listings(model_id);
create index if not exists idx_listings_price on public.listings(price);
create index if not exists idx_listings_published_at on public.listings(published_at);
create index if not exists idx_listings_first_seen on public.listings(first_seen_at);
create index if not exists idx_listings_active on public.listings(is_active);

-- ------------------------------------------------------------------
-- favorites
-- ------------------------------------------------------------------
create table if not exists public.favorites (
  user_id text not null references public.users(id) on delete cascade,
  listing_id text not null references public.listings(id) on delete cascade,
  created_at text not null,
  primary key (user_id, listing_id)
);
create index if not exists idx_favorites_listing on public.favorites(listing_id);

-- ------------------------------------------------------------------
-- saved_searches
-- ------------------------------------------------------------------
create table if not exists public.saved_searches (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  name text not null,
  query text,
  brand_id text,
  category_id text,
  model_id text,
  min_price real,
  max_price real,
  currency text not null default 'EUR',
  sizes text not null default '[]',
  conditions text not null default '[]',
  colors text not null default '[]',
  keywords_include text not null default '[]',
  keywords_exclude text not null default '[]',
  is_active integer not null default 1,
  notification_enabled integer not null default 1,
  notification_channel text not null default 'in_app',
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_saved_searches_user on public.saved_searches(user_id);

-- ------------------------------------------------------------------
-- search_events (analytics)
-- ------------------------------------------------------------------
create table if not exists public.search_events (
  id text primary key,
  user_id text,
  query text,
  filters text not null default '{}',
  result_count integer not null default 0,
  has_results integer not null default 0,
  created_at text not null
);

-- ------------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------------
create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  type text not null default 'new_match',
  title text not null,
  message text not null,
  listing_id text references public.listings(id) on delete set null,
  saved_search_id text references public.saved_searches(id) on delete set null,
  read_at text,
  created_at text not null
);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at);

-- ------------------------------------------------------------------
-- ingestion_runs / ingestion_errors
-- ------------------------------------------------------------------
create table if not exists public.ingestion_runs (
  id text primary key,
  provider text not null,
  started_at text not null,
  finished_at text,
  status text not null default 'running',
  listings_found integer not null default 0,
  listings_new integer not null default 0,
  listings_updated integer not null default 0,
  duplicates integer not null default 0,
  errors integer not null default 0,
  latency_ms integer,
  meta text
);

create table if not exists public.ingestion_errors (
  id text primary key,
  run_id text references public.ingestion_runs(id) on delete set null,
  provider text not null,
  external_id text,
  message text not null,
  created_at text not null
);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.models enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.search_events enable row level security;
alter table public.notifications enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.ingestion_errors enable row level security;

-- Public catalogue data is readable by anyone (the app is a search layer).
create policy "public_read_brands" on public.brands for select using (true);
create policy "public_read_categories" on public.categories for select using (true);
create policy "public_read_models" on public.models for select using (true);
create policy "public_read_listings" on public.listings for select using (true);
create policy "public_read_ingestion_runs" on public.ingestion_runs for select using (true);

-- Users only read/update their own row.
create policy "users_read_own" on public.users for select using (auth.uid()::text = id);
create policy "users_update_own" on public.users for update using (auth.uid()::text = id);

-- Sessions only for the owner (server uses UUID tokens, not Auth.uid()).
create policy "sessions_read_own" on public.sessions for select using (auth.uid()::text = user_id);
create policy "sessions_write_own" on public.sessions for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- Favorites: owners only.
create policy "favorites_read_own" on public.favorites for select using (auth.uid()::text = user_id);
create policy "favorites_insert_own" on public.favorites for insert with check (auth.uid()::text = user_id);
create policy "favorites_delete_own" on public.favorites for delete using (auth.uid()::text = user_id);

-- Saved searches: owners only.
create policy "saved_searches_read_own" on public.saved_searches for select using (auth.uid()::text = user_id);
create policy "saved_searches_insert_own" on public.saved_searches for insert with check (auth.uid()::text = user_id);
create policy "saved_searches_update_own" on public.saved_searches for update using (auth.uid()::text = user_id);
create policy "saved_searches_delete_own" on public.saved_searches for delete using (auth.uid()::text = user_id);

-- Notifications: owners only.
create policy "notifications_read_own" on public.notifications for select using (auth.uid()::text = user_id);
create policy "notifications_insert_own" on public.notifications for insert with check (auth.uid()::text = user_id);
create policy "notifications_update_own" on public.notifications for update using (auth.uid()::text = user_id);

-- Search events: insert by anyone; only service role reads them.
create policy "search_events_insert" on public.search_events for insert with check (true);

-- Service role can do anything (used by the server via SUPABASE_SERVICE_ROLE_KEY).
-- The migration is run by the DBA; these default policies are the safety net.