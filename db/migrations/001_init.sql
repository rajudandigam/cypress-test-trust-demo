CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  traveler_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flights (
  id TEXT PRIMARY KEY,
  flight_number TEXT NOT NULL,
  carrier TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_at TIMESTAMPTZ NOT NULL,
  arrival_at TIMESTAMPTZ NOT NULL,
  fare_code TEXT NOT NULL,
  base_cents INTEGER NOT NULL CHECK (base_cents >= 0),
  taxes_fees_cents INTEGER NOT NULL CHECK (taxes_fees_cents >= 0),
  currency TEXT NOT NULL CHECK (currency = 'USD'),
  stops INTEGER NOT NULL DEFAULT 0,
  duration_mins INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tenant_id TEXT NOT NULL,
  itinerary_id TEXT NOT NULL REFERENCES flights(id),
  fare_code TEXT NOT NULL,
  passenger_count INTEGER NOT NULL CHECK (passenger_count = 1),
  base_cents INTEGER NOT NULL,
  taxes_fees_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency = 'USD'),
  itinerary_snapshot JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tenant_id TEXT NOT NULL,
  quote_id TEXT NOT NULL REFERENCES quotes(id),
  itinerary_id TEXT NOT NULL,
  fare_code TEXT NOT NULL,
  traveler_id TEXT NOT NULL,
  traveler_email TEXT NOT NULL,
  traveler_name TEXT NOT NULL,
  base_cents INTEGER NOT NULL,
  taxes_fees_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency = 'USD'),
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
  provider_reference TEXT,
  itinerary_snapshot JSONB NOT NULL,
  idempotency_key TEXT NOT NULL,
  idempotency_payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_flights_route_date ON flights(origin, destination, departure_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
