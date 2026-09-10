# SKYLINE — Technical Design Document (TDD) v0.1

## 44. DATABASE SCHEMA (PostgreSQL 16)
Conventions: `id UUID PK`, `created_at timestamptz`, money `BIGINT cents`, soft-delete where needed. Key indexes noted.

```sql
-- users/auth
users(id UUID PK, email CITEXT UNIQUE, pw_hash TEXT, display_name TEXT, created_at, last_login, status, country);
oauth_accounts(id UUID PK, user_id FK, provider TEXT, provider_uid TEXT UNIQUE);
-- airlines (1 user can own N via prestige/subsidiaries, 1 active per season)
airlines(id UUID PK, user_id FK, season_id FK, name TEXT UNIQUE, icao CHAR(3) UNIQUE, colors JSONB, home_airport_id FK, cash_cents BIGINT, rep SMALLINT, level INT, xp BIGINT, valuation_cents BIGINT, archetype TEXT, crew_level SMALLINT, headquarters_level SMALLINT, prestige_count SMALLINT, prestige_buff JSONB, created_at);
airline_daily_stats(airline_id FK, day DATE, revenue_cents, cost_cents, profit_cents, pax INT, flights INT, lf REAL, PK(airline_id,day));
-- reference data (seeded, versioned)
aircraft_models(id TEXT PK, name TEXT, class TEXT, seats_max SMALLINT, range_km INT, fuel_kgph INT, speed_kmh INT, buy_cents BIGINT, lease_cents BIGINT, turn_min SMALLINT, comfort SMALLINT, cargo_t REAL, runway_m INT, noise SMALLINT, family TEXT);
airports(id TEXT PK, name TEXT, city TEXT, country CHAR(2), region TEXT, tier SMALLINT, pop BIGINT, gdppc INT, tourism REAL, business REAL, fee_pax_cents INT, fee_mov_cents INT, slots_hour SMALLINT, runway_m INT, curfew TEXT, conn_index REAL, seasonality JSONB);
-- fleet
aircraft(id UUID PK, airline_id FK, model_id FK, acquisition TEXT, condition REAL, age_days INT, cycles INT, hours REAL, config JSONB, base_airport_id FK, status TEXT, lease_ends_at DATE, next_check_at DATE, INDEX(airline_id,status));
-- network
routes(id UUID PK, airline_id FK, from_id FK, to_id FK, aircraft_id FK NULL, freq_per_day SMALLINT, fares JSONB, status TEXT, profit_7d BIGINT, lf_7d REAL, UNIQUE(airline_id,from_id,to_id), INDEX(airline_id,status));
slots(id UUID PK, airport_id FK, airline_id FK NULL, hour SMALLINT, is_peak BOOL, season_id FK, UNIQUE(airport_id,hour,airline_id,season_id));
flights(id UUID PK, route_id FK, airline_id FK, day DATE, dep_hour SMALLINT, pax INT, revenue_cents BIGINT, cost_cents BIGINT, status TEXT, INDEX(airline_id,day));
-- economy
transactions(id UUID PK, airline_id FK, day DATE, type TEXT, amount_cents BIGINT, meta JSONB, idempotency_key TEXT UNIQUE, INDEX(airline_id,day));
loans(id UUID PK, airline_id FK, principal_cents BIGINT, apr REAL, down_cents BIGINT, term_days INT, balance_cents BIGINT, status TEXT);
contracts(id UUID PK, sponsor TEXT, from_id FK, to_id FK, req JSONB, reward_cents BIGINT, bonus_cents BIGINT, penalty_cents BIGINT, ends_at DATE, claimed_by FK NULL, status TEXT);
fuel_marks(day DATE PK, price_cents INT); fuel_locks(id UUID PK, airline_id FK, price_cents INT, qty_kg INT, expires DATE);
research_nodes(id TEXT PK, branch TEXT, tier SMALLINT, effect JSONB, cost_cents BIGINT, days SMALLINT);
airline_research(airline_id FK, node_id FK, state TEXT, finishes_at DATE, PK(airline_id,node_id));
missions(id TEXT PK, cadence TEXT, goal JSONB, reward JSONB); airline_missions(airline_id FK, mission_id FK, day DATE, progress JSONB, state TEXT, PK(airline_id,mission_id,day));
achievements(id TEXT PK, secret BOOL, goal JSONB); airline_achievements(airline_id FK, achievement_id FK, unlocked_at, PK);
alliances(id UUID PK, name TEXT UNIQUE, tag CHAR(4) UNIQUE, level INT, score BIGINT); alliance_members(alliance_id FK, airline_id FK UNIQUE, role TEXT, contrib BIGINT);
events(id UUID PK, kind TEXT, starts_at DATE, ends_at DATE, effect JSONB, target_routes JSONB);
seasons(id UUID PK, name TEXT, starts_at DATE, ends_at DATE, speed_mult REAL, status TEXT);
leaderboards_cache(season_id FK, board TEXT, airline_id FK, rank INT, score BIGINT, updated_at, PK(season_id,board,airline_id));
-- monetization
wallets(user_id FK PK, sc_balance INT, vip_until DATE, pass_xp INT);
purchases(id UUID PK, user_id FK, store_sku TEXT, price_cents INT, provider TEXT, provider_txn TEXT UNIQUE, status TEXT, granted JSONB);
-- ops
tick_state(id TEXT PK, last_day DATE, last_run_at); outbox(id UUID PK, topic TEXT, payload JSONB, claimed_at NULL, INDEX(topic));
push_tokens(user_id FK, token TEXT, platform TEXT, PK(user_id,token));
```
Why: `transactions.idempotency_key` + `outbox` = safe retries; daily buckets scale (no per-flight hot rows for offline); reference tables versioned per season for balance patches.

## 45. BACKEND STACK (RECOMMENDED)
**Frontend web: Next.js 14 (React, TypeScript) + Tailwind + Leaflet map.** Why: SEO/landing + app in one, Vercel-fast, hires easy.
**Backend: Node 20 + TypeScript + Fastify + Prisma + Zod.** Why NOT Python: single language with web/mobile (small team velocity), shared sim types, BullMQ ecosystem. Python/NumPy unnecessary—sim is arithmetic, not ML. If team is Python-strong, FastAPI equivalent is fine, but keep sim as pure `packages/sim` with zero I/O so it ports.
**DB: PostgreSQL (Neon/Supabase/RDS) + Redis (Upstash) + S3/CDN for liveries.** Queue: BullMQ. Realtime: WebSocket (Socket.io) only for tick ticker + alerts; rest REST. Mobile later: Expo React Native reusing `packages/api-client` + Zod schemas.
Server-authoritative: client sends intents (`POST /routes`), sim worker applies; money/flights/rewards only mutated in workers with `SERIALIZABLE` + idempotency keys. Never trust client clock.

```
[Next.js] -> [Fastify API] -> [Postgres/Redis]
                    \-> [BullMQ: tick-day, ai-day, event-day, billing] -> [Sim package (pure fns)]
[Expo RN] -> same API (versioned /v1)
```

## 46. SIMULATION ENGINE (scales to millions)
**No per-second loops.** Time bucketed to game-days. Architecture:
- `tick-day` cron every N real-min (e.g. 30m = 1 game-day): enqueues one job per *shard* (e.g. 10k airlines/shard), not per airline per second. Worker loads shard's ACTIVE routes/aircraft, runs pure `simulateDay(airlineState, marketState)` (~0.5ms/airline), writes `flights` aggregate + `transactions` batch (COPY), updates `airline_daily_stats`. Idempotent on `(airline_id, day)`.
- Hourly mini-tick only for fuel/AI scouting/event triggers (global, not per-airline).
- Offline catch-up = same fn with `daysMissed` loop capped 7 full + degraded.
- Concurrency: Postgres advisory lock per shard; retries via outbox; DLQ + replay.
- Capacity math: 1M airlines * 0.5ms = ~8 min single core; 8 workers → ~1 min/tick. Shard + read replicas + `leaderboards_cache` (no live rank queries).
Flight lifecycle inside day-bucket: deterministic RNG seeded `(airline_id, day)` so retries identical.

## 47. API DESIGN (REST /v1, Zod, JWT+refresh)
```
POST /auth/signup|login|refresh
POST /airlines {name,icao,homeAirportId,archetype} -> 201 {airline}
GET  /airlines/me -> {cash,rep,level,valuation,stats}
GET  /airports?region=&tier= -> [{...,demandIndex,slotsFree}]
GET  /aircraft-models -> [...]
POST /fleet/lease {modelId,config,base} -> {aircraft, deliveryDay}
POST /fleet/:id/config {cabins} | POST /fleet/:id/sell
POST /routes {from,to,aircraftId,freq,fares} -> {route, preview:{lf,profit,breakeven}}
POST /routes/:id/optimize -> {suggestedFares, deltaProfit} (server sim, no auto-apply)
POST /routes/:id/status {active|suspended}
GET  /finance/summary?days=30 | GET /finance/routes?sort=profit
POST /research/:nodeId/start
GET  /missions/daily | POST /missions/:id/claim (idempotency-key header)
GET  /leaderboards/:board?season=
POST /alliances | POST /alliances/:id/join | GET /contracts | POST /contracts/:id/bid
POST /store/checkout {sku} -> {providerUrl} ; POST /webhooks/stripe|apple|google (verify sig)
GET  /reports/away?since= -> {flights,pax,revenue,profit,repDelta,alerts}
```
Example: `POST /routes` req `{from:"DAC",to:"DXB",aircraftId:"...",freq:3,fares:{Y:279,J:890}}` res `{routeId, preview:{lf:0.78, revenue:91200, cost:64000, profit:27200, belles:{...}}}`. All mutations require `Idempotency-Key`.

## 48. SECURITY + ANTI-CHEAT
- Auth: argon2, JWT 15m + rotating refresh, rate-limit (Redis sliding, 60/min/IP, 10/s/user), lockout.
- Authoritative sim: reject client-computed money; validate ownership, slot availability, range/runway server-side; use server clock only.
- Idempotency: every reward/claim keyed; double-claim returns original.
- Anti-bot: fingerprint + HMAC device token for mobile, CAPTCHA on signup, tick-speed anomaly detection (profit/hr z-score → shadow review, not auto-ban).
- Purchases: verify Stripe/Apple/Google server-side, `provider_txn UNIQUE`, grant in TX.
- Time cheat: ignore client time; offline computed from `tick_state.last_day`.

## 49-50. WEB + MOBILE ARCHITECTURE
Web IA: `/dashboard /map /fleet /fleet/:id /routes /airports /schedule /finance /research /missions /events /alliance /leaderboard /store /hq /profile`. Nav: left rail (desktop) / bottom 5 (mobile): Home, Map, Fleet, Routes, More. CEO default; Analyst toggle persists. Map: Leaflet + canvas great-circle arcs, hub-spoke clustering (no 3D globe in MVP—perf).
Mobile (Expo RN): Home shows Cash/DailyProfit/Fleet dots/Routes/Alerts/Missions/Events; Quick Actions sheet (Buy/Route/Fare/Repair/Collect); push via Expo Notifications; offline read cache (React Query persist), all writes queued. Feels native: haptics, swipe-to-collect, one-thumb FAB.

## 51-53. NOTIFICATIONS / SOCIAL / YEARLY REPORT
Push categories (opt-in each, max 2/day default): ops (maint/delivery), market (demand shock on owned routes), competitive (undercut on top route), progression (level/slot/event). Social: profiles, friends (invite code), compare card, alliances, shareable route map + Yearly Report (`Flights/Pax/Dests/Revenue/Profit/Rank/Best route/Best aircraft/Personality`) as OG image via Satori. Optional only.

## 54. MVP SCOPE (8-10 wks, 2-3 devs)
IN: auth, airline create, 72 airports, 100 fictional models (100_fictional_aircraft_airline_tycoon.md, stats derived per class), lease/cash-buy/used/resale, config Y/PY/J, routes + preview + optimize, demand/pricing tick, pax + freighter revenue, flights auto, revenue/opex, maint A/C, rep, 4 AI personalities (simple), Leaflet map, missions/story/daily, offline catch-up + away report, leaderboard (profit/pax), basic finance.
OUT: loans/hedging, freighters, alliances-create (join stub only), slot trading, subsidiaries, F cabin, 3D HQ, live Olympics, charter, SAF, subsidiaries, voice/chat, tournaments. Each OUT has stub/flag so no re-arch.

## 55. ROADMAP (phases, exit criteria)
P0 validation (1-2w): paper sim in Sheets + 20 playtests → target: 70% understand loop in 5 min. P1 prototype (2w): sim package + CLI tick → profit curves sane. P2 sim engine (3w): day worker + idempotency + 100k bot airlines load test (<2m/tick). P3 MVP web (6-8w): above scope → alpha-ready. P4 closed alpha (3w, 200 users): D1>40%, tutorial completion>70%. P5 open beta (4w, 5k): D7>20%, crash<1%. P6 web launch + season 1. P7 mobile (6w Expo). P8 multiplayer (alliances/codeshare). P9 live events calendar. P10 live-ops (monthly aircraft/airport/contract drops). Dependencies: sim→API→web→mobile; art parallel.

## 56-57. TEAM + COST (labeled estimates, 2026)
Solo: designer+fullstack (you) + AI art + contracted logo ($500) → 6-9 mo to MVP; cost $3-8k (infra $100/mo) / BDT 3.5-9.5L.
2-3 indie (recommended): 1 BE, 1 FE, 0.5 UX/art → 3-4 mo MVP; $25-60k / BDT 30-70L (salaries vary; BD-based ~40% lower).
Pro studio 5-7: +mobile, QA, PM, DevOps → 3 mo MVP + polish; $120-250k / BDT 1.4-3Cr.
Infra/mo at 10k DAU: $200-600 (DB $100, Redis $50, workers $100, CDN $50); at 500k DAU $3-8k. Payments 3-5% + store 15-30%. Marketing separate ($5-20k soft launch).
Assumes remote, open-source art libs, fictional liveries (no licenses).

## 58. ANALYTICS (healthy ranges for tycoon)
D1 >35-45%, D7 15-25%, D30 8-12%; sess 6-12m, 2-3 sess/d; tutorial finish >65%; route create/airline/d >1.5; bankruptcy <8%/mo (>15% = too hard); mission daily completion >40%; event participation >25%; pass conv 5-12%, VIP 2-5%, ARPPU $8-20, LTV $3-9. Warn: LF>95% everywhere (demand too high), profit never negative (no tension), Day-1 churn at pricing screen (simplify).

## 59-60. LIVEOPS + PSYCHOLOGY (healthy)
Content pipeline: monthly cadence (1 aircraft niche + 2 airports + contracts + skin), quarterly season (map twist + meta rebalance + pass), yearly prestige path. Gacha-free; transparent odds only for used-market refresh. Psych drivers: ownership (livery/HQ), mastery (BELF optimization), collection (fleet/airports), competition (ranks, not attacks), discovery (events). No stamina-that-blocks-flying, no lootboxes for power, cooldowns only on boosts.

## 61. FINAL UNIFIED DESIGN (checklist mapping)
Pitch/loop/econ/fleet/airport/route/pax/competition/multi/events/monet/UX/backend/DB/sim/mobile/MVP/roadmap/team/cost/analytics/retention — all above; single source of truth = `packages/sim` + this doc + `schema.sql`.

## ASSUMPTIONS
1) Fictional aircraft/airport names to avoid licensing. 2) 1 game-day=30m real tunable. 3) Single-season server + prestige. 4) USD base, BDT shown for costs. 5) No real-money cash-out. Bad mechanics rejected: manual per-flight clicking (replaced by automation), permanent slot purchase with cash (replaced by time-boxed priority), lootbox aircraft (rejected—direct purchase only).
