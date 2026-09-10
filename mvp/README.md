# Skyline MVP scaffold
See GDD.md + TDD.md. Run: `npm i typescript fastify @fastify/websocket ioredis bullmq pg zod` then implement workers per TDD §46.
Structure:
- mvp/schema.sql — Postgres schema (apply with psql)
- mvp/sim-engine.ts — pure sim (import into worker; unit-test with vitest)
- mvp/seed.json — TODO: 28 airports + 12 models (use GDD §4/§7 values)
- api: validate with Zod, mutate only via BullMQ jobs with Idempotency-Key, tick worker writes transactions+stats.
Next steps (Phase 1-3): seed data → tick-day worker → POST /routes with preview → Next.js dashboard + Leaflet map.
