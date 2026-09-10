-- Skyline MVP schema (PostgreSQL). Money in cents. See TDD.md §44.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE TABLE users(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email CITEXT UNIQUE NOT NULL, pw_hash TEXT NOT NULL, display_name TEXT, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE seasons(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, starts_at DATE, ends_at DATE, speed_mult REAL DEFAULT 1, status TEXT);
CREATE TABLE airports(id TEXT PRIMARY KEY, name TEXT NOT NULL, city TEXT, country CHAR(2), region TEXT, tier SMALLINT, pop BIGINT, gdppc INT, tourism REAL, business REAL, fee_pax_cents INT, fee_mov_cents INT, slots_hour SMALLINT, runway_m INT, conn_index REAL, seasonality JSONB);
CREATE TABLE aircraft_models(id TEXT PRIMARY KEY, name TEXT, class TEXT, seats_max SMALLINT, range_km INT, fuel_kgph INT, speed_kmh INT, buy_cents BIGINT, lease_cents BIGINT, turn_min SMALLINT, comfort SMALLINT, cargo_t REAL, runway_m INT, family TEXT);
CREATE TABLE airlines(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id), season_id UUID REFERENCES seasons(id), name TEXT UNIQUE NOT NULL, icao CHAR(3) UNIQUE NOT NULL, home_airport_id TEXT REFERENCES airports(id), cash_cents BIGINT NOT NULL DEFAULT 500000000, rep SMALLINT DEFAULT 50, level INT DEFAULT 1, xp BIGINT DEFAULT 0, archetype TEXT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE aircraft(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE, model_id TEXT REFERENCES aircraft_models(id), condition REAL DEFAULT 100, age_days INT DEFAULT 0, cycles INT DEFAULT 0, hours REAL DEFAULT 0, config JSONB DEFAULT '{"Y":150}', base_airport_id TEXT REFERENCES airports(id), status TEXT DEFAULT 'ACTIVE', lease_ends_at DATE);
CREATE INDEX ON aircraft(airline_id, status);
CREATE TABLE routes(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE, from_id TEXT REFERENCES airports(id), to_id TEXT REFERENCES airports(id), aircraft_id UUID REFERENCES aircraft(id), freq_per_day SMALLINT DEFAULT 1, fares JSONB DEFAULT '{"Y":29900}', status TEXT DEFAULT 'ACTIVE', UNIQUE(airline_id, from_id, to_id));
CREATE TABLE transactions(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE, day DATE NOT NULL, type TEXT NOT NULL, amount_cents BIGINT NOT NULL, meta JSONB, idempotency_key TEXT UNIQUE NOT NULL);
CREATE INDEX ON transactions(airline_id, day);
CREATE TABLE airline_daily_stats(airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE, day DATE NOT NULL, revenue_cents BIGINT DEFAULT 0, cost_cents BIGINT DEFAULT 0, pax INT DEFAULT 0, flights INT DEFAULT 0, PRIMARY KEY(airline_id, day));
CREATE TABLE tick_state(id TEXT PRIMARY KEY, last_day DATE NOT NULL, last_run_at TIMESTAMPTZ DEFAULT now());
