export const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  notification_settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  aliases TEXT NOT NULL DEFAULT '[]',
  image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_brands_normalized ON brands(normalized_name);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_models_brand ON models(brand_id);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  brand_id TEXT,
  category TEXT,
  category_id TEXT,
  model TEXT,
  model_id TEXT,
  gender TEXT,
  size TEXT,
  size_normalized TEXT,
  color TEXT,
  condition TEXT,
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  images TEXT NOT NULL DEFAULT '[]',
  seller_id TEXT,
  seller_name TEXT,
  location TEXT,
  published_at TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  relevance_data TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_listings_source_external ON listings(source, external_id);
CREATE INDEX IF NOT EXISTS idx_listings_brand_id ON listings(brand_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_model_id ON listings(model_id);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_published_at ON listings(published_at);
CREATE INDEX IF NOT EXISTS idx_listings_first_seen ON listings(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON favorites(listing_id);

CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT,
  brand_id TEXT,
  category_id TEXT,
  model_id TEXT,
  min_price REAL,
  max_price REAL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  sizes TEXT NOT NULL DEFAULT '[]',
  conditions TEXT NOT NULL DEFAULT '[]',
  colors TEXT NOT NULL DEFAULT '[]',
  keywords_include TEXT NOT NULL DEFAULT '[]',
  keywords_exclude TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  notification_enabled INTEGER NOT NULL DEFAULT 1,
  notification_channel TEXT NOT NULL DEFAULT 'in_app',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);

CREATE TABLE IF NOT EXISTS search_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  query TEXT,
  filters TEXT NOT NULL DEFAULT '{}',
  result_count INTEGER NOT NULL DEFAULT 0,
  has_results INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'new_match',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
  saved_search_id TEXT REFERENCES saved_searches(id) ON DELETE SET NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  listings_found INTEGER NOT NULL DEFAULT 0,
  listings_new INTEGER NOT NULL DEFAULT 0,
  listings_updated INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  meta TEXT
);

CREATE TABLE IF NOT EXISTS ingestion_errors (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  external_id TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`