# MikroORM v7 Compatibility + Real Integration Tests
**Date:** July 4, 2026
**Project:** @owservable/postgres
**Version:** 3.0.3
**Impact:** Fixes 3.0.2 (broken against its own peer range) and closes the mocked-test blind spot

## What broke with MikroORM v7

- `orm.schema.updateSchema()` was renamed to `orm.schema.update()` — 3.0.2 (peer `^7.1.5`) called the v6 name and crashed every consumer at boot. Fixed in `src/postgres.connector.ts`.
- v7 is **ESM-only** (`"type": "module"`, no CJS export). CJS consumers work via Node ≥22 require-of-ESM; jest's CJS runtime cannot load it at all — which is why the unit suite mocks the ORM.
- v7 removed legacy decorators from core. Consumers define entities with `defineEntity` (recommended; `EntitySchema` also works). The `.name` of a `defineEntity` result resolves correctly through `orm.getMetadata().get(entity.name)`, so the adapter needs no change for either style. `PostgresLiveUpdatesRegistry.add(entity)` is the live-update opt-in for schema-defined entities; the `@PostgresLiveUpdates()` decorator remains for decorator-class apps.

## Why the 100%-coverage suite missed it

Every unit test mocks the ORM, so the mocks accept whatever method name the source calls — 100% line coverage, zero API-contract coverage. Real-API drift (like the `updateSchema` rename) is structurally invisible to mocked tests.

## The fix: a real integration harness

`test/integration/postgres.integration.ts` — a ts-node script (not jest, because of the ESM constraint) that runs the full pipeline with the real MikroORM against a real PostgreSQL it **brings along itself**: the harness starts a throwaway embedded PostgreSQL (`embedded-postgres` devDependency — real PG binaries, temp data dir, port 54329, wiped on teardown). **Zero machine prerequisites** — no local database, no container, nothing to set up; same philosophy as `mongodb-memory-server` in consumer test suites.

Covered end to end: init → schema sync → trigger install → LISTEN → insert/update/delete NOTIFYs → PK-refetch enrichment → column→property mapping in `updateDescription` → Mongo-style `$gte` query, `count`, `findById` pk coercion → delete without refetch → trigger idempotency (second `CREATE OR REPLACE` run) → cleanup.

### Run

```bash
pnpm integration
```

To point it at an external PostgreSQL instead of the embedded one, set `OWSERVABLE_PG_HOST` (plus optional `OWSERVABLE_PG_PORT` / `OWSERVABLE_PG_USER` / `OWSERVABLE_PG_PASSWORD` / `OWSERVABLE_PG_DBNAME`).

The harness lives outside the jest suite (`.skeletest.json` ignores `test/integration`) and is the release gate for any MikroORM version bump: if `pnpm integration` passes, the adapter's real API usage is verified.
