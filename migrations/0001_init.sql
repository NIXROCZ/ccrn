-- Raising Noble — D1 schema. Idempotent so it can be applied via wrangler migrations or directly.

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                       -- uuid
  order_number TEXT NOT NULL UNIQUE,         -- RN-XXXXXX
  customer_email TEXT NOT NULL,              -- lower-cased
  status TEXT NOT NULL DEFAULT 'pending',    -- pending | paid | expired | refunded | refunded_non_au
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  currency TEXT NOT NULL DEFAULT 'aud',
  kit_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  bundle_discount_cents INTEGER NOT NULL DEFAULT 0,
  gift_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  gift_applied_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,    -- amount charged by Stripe (0 when fully covered by gift balance)
  billing_country TEXT,
  items_json TEXT NOT NULL,                  -- validated cart snapshot
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);

CREATE TABLE IF NOT EXISTS download_grants (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  customer_email TEXT NOT NULL,
  kit_id TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(order_id, kit_id)
);
CREATE INDEX IF NOT EXISTS idx_grants_email_kit ON download_grants(customer_email, kit_id);

CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL REFERENCES download_grants(id),
  ip_hash TEXT,
  user_agent TEXT,
  downloaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_downloads_grant_time ON downloads(grant_id, downloaded_at);

CREATE TABLE IF NOT EXISTS gift_cards (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  code_last4 TEXT NOT NULL,
  initial_cents INTEGER NOT NULL,
  balance_cents INTEGER NOT NULL,            -- unspent (includes reserved)
  reserved_cents INTEGER NOT NULL DEFAULT 0, -- held by pending checkouts
  purchaser_email TEXT NOT NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  message TEXT,
  order_id TEXT REFERENCES orders(id),
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (balance_cents >= 0),
  CHECK (reserved_cents >= 0),
  CHECK (reserved_cents <= balance_cents)
);
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchaser ON gift_cards(purchaser_email);

CREATE TABLE IF NOT EXISTS gift_redemptions (
  id TEXT PRIMARY KEY,
  gift_card_id TEXT NOT NULL REFERENCES gift_cards(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',   -- reserved | applied | released
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(gift_card_id, order_id)
);
CREATE INDEX IF NOT EXISTS idx_redemptions_order ON gift_redemptions(order_id);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',    -- pending | confirmed | unsubscribed
  confirm_token_hash TEXT,
  unsub_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  confirmed_at TEXT,
  unsubscribed_at TEXT
);

CREATE TABLE IF NOT EXISTS kit_notify (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  kit_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  notified_at TEXT,
  UNIQUE(email, kit_id)
);
