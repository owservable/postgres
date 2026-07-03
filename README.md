![owservable](https://avatars0.githubusercontent.com/u/87773159?s=75)

# @owservable/postgres

PostgreSQL backend adapter for [@owservable/core](https://github.com/owservable/core): live data via LISTEN/NOTIFY triggers over MikroORM entities.

## 🚀 Features

- **PostgresBackend**: implements `IObservableBackend` over a MikroORM entity — change feed, queries with Mongo-style operators, relation population
- **PostgresListener**: one dedicated LISTEN connection with automatic reconnection; stores force a reload after reconnect to cover missed notifications
- **ObservableTable**: normalizes trigger notifications into change events (PK-refetch enrichment, column→property mapping) shaped exactly like MongoDB change streams
- **installTriggers**: idempotent `CREATE OR REPLACE` bootstrap (PostgreSQL 14+) — no migration files
- **@LiveUpdates()**: one-line decorator to opt an entity's table into live updates
- **processEntities**: scans per-module entity folders and returns the classes for `MikroORM.init`
- **PostgresConnector**: MikroORM init, advisory-locked `updateSchema({safe: true})`, trigger install and backend registration in one call

## 📦 Installation

```bash
npm install @owservable/core @owservable/postgres @mikro-orm/core @mikro-orm/postgresql
```

or

```bash
pnpm add @owservable/core @owservable/postgres @mikro-orm/core @mikro-orm/postgresql
```

`@owservable/core`, `@mikro-orm/core`, `@mikro-orm/postgresql` and `rxjs` are peer dependencies.

## 📄 License

Unlicense — see [LICENSE](LICENSE).
