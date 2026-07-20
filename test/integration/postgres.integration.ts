'use strict';

import * as os from 'node:os';
import * as path from 'node:path';
import assert from 'node:assert/strict';

import {Client} from 'pg';
import EmbeddedPostgres from 'embedded-postgres';
import {defineEntity} from '@mikro-orm/postgresql';

import {BackendRegistry} from '@owservable/core';

import PostgresListener from '../../src/postgres.listener';
import PostgresConnector from '../../src/postgres.connector';
import PostgresTablesEntitiesMap from '../../src/tables.entities.map';
import installPostgresTriggers from '../../src/functions/install.triggers';
import {PostgresLiveUpdatesRegistry} from '../../src/decorators/live.updates';

const EXTERNAL: boolean = !!process.env.OWSERVABLE_PG_HOST;

const HOST: string = process.env.OWSERVABLE_PG_HOST ?? 'localhost';
const PORT: number = Number(process.env.OWSERVABLE_PG_PORT ?? 54329);
const USER: string = process.env.OWSERVABLE_PG_USER ?? 'owservable_test';
const PASSWORD: string = process.env.OWSERVABLE_PG_PASSWORD ?? USER;
const DBNAME: string = process.env.OWSERVABLE_PG_DBNAME ?? USER;
const CHANNEL: string = 'owservable_integration';

const TABLE: string = 'pg_integration';

const PgIntegration = defineEntity({
	name: 'PgIntegration',
	tableName: TABLE,
	properties: (p: any) => ({
		id: p.integer().primary().autoincrement(),
		name: p.string(),
		amount: p.integer().nullable(),
		createdAt: p.datetime().onCreate((): Date => new Date()),
		updatedAt: p
			.datetime()
			.onCreate((): Date => new Date())
			.onUpdate((): Date => new Date())
	})
});
PostgresLiveUpdatesRegistry.add(PgIntegration);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate: () => boolean, what: string, timeoutMs: number = 5000): Promise<void> => {
	const start: number = Date.now();
	while (!predicate()) {
		if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for: ${what}`);
		await sleep(50);
	}
};

const startEmbeddedPostgres = async (): Promise<any> => {
	const databaseDir: string = path.join(os.tmpdir(), `owservable-pg-integration-${process.pid}`);
	const embedded: any = new (EmbeddedPostgres as any)({
		databaseDir,
		user: USER,
		password: PASSWORD,
		port: PORT,
		persistent: false
	});
	await embedded.initialise();
	await embedded.start();
	await embedded.createDatabase(DBNAME);
	return embedded;
};

const dropTable = async (): Promise<void> => {
	const client: Client = new Client({host: HOST, port: PORT, user: USER, password: PASSWORD, database: DBNAME});
	await client.connect();
	await client.query('DROP TABLE IF EXISTS "pg_integration" CASCADE');
	await client.end();
};

const run = async (): Promise<void> => {
	await dropTable();

	console.log('[integration] 1. PostgresConnector.init (MikroORM init, schema sync, triggers, listener, registry)');
	const orm: any = await PostgresConnector.init({
		entities: [PgIntegration],
		host: HOST,
		port: PORT,
		user: USER,
		password: PASSWORD,
		dbName: DBNAME,
		channel: CHANNEL
	});

	assert.equal(BackendRegistry.has(TABLE), true, 'backend registered');
	assert.equal(PostgresTablesEntitiesMap.getEntityByTable(TABLE), PgIntegration, 'entity mapped');

	const meta: any = orm.getMetadata().get(PgIntegration.name);
	assert.equal(meta.tableName, TABLE, 'metadata resolves by entity.name');

	const notifications: any[] = [];
	PostgresListener.instance.notifications.subscribe((n: any) => notifications.push(n));

	const backend: any = BackendRegistry.get(TABLE);
	const changes: any[] = [];
	backend.changes().subscribe((c: any) => changes.push(c));
	await sleep(300);

	console.log('[integration] 2. INSERT -> notification + normalized change event');
	const em: any = orm.em.fork();
	const row: any = em.create(PgIntegration, {name: 'row-one', amount: 1});
	await em.persist(row).flush();

	await waitFor(() => notifications.some((n) => 'insert' === n.op), 'insert notification');
	const insertNotification: any = notifications.find((n) => 'insert' === n.op);
	assert.equal(insertNotification.table, TABLE, 'insert notification table');
	assert.equal(String(insertNotification.id), String(row.id), 'insert notification pk');

	await waitFor(() => changes.some((c) => 'insert' === c.operationType), 'normalized insert event');
	const insertChange: any = changes.find((c) => 'insert' === c.operationType);
	assert.equal(String(insertChange.documentKey._id), String(row.id), 'insert documentKey._id');
	assert.equal(insertChange.fullDocument.name, 'row-one', 'insert fullDocument enriched via PK refetch');

	console.log('[integration] 3. UPDATE -> changed columns mapped to camelCase properties');
	row.name = 'row-one-renamed';
	await em.flush();

	await waitFor(() => changes.some((c) => 'update' === c.operationType), 'normalized update event');
	const updateNotification: any = notifications.find((n) => 'update' === n.op);
	assert.ok(updateNotification.changed.includes('name'), 'update changed contains name column');
	assert.ok(updateNotification.changed.includes('updated_at'), 'update changed contains updated_at column');

	const updateChange: any = changes.find((c) => 'update' === c.operationType);
	const updatedFieldKeys: string[] = Object.keys(updateChange.updateDescription.updatedFields);
	assert.ok(updatedFieldKeys.includes('name'), 'updatedFields has property name');
	assert.ok(updatedFieldKeys.includes('updatedAt'), 'updatedFields maps updated_at -> updatedAt');
	assert.equal(updateChange.fullDocument.name, 'row-one-renamed', 'update fullDocument is fresh');

	console.log('[integration] 4. Backend queries (find/count/findById with Mongo-style operators)');
	const em2: any = orm.em.fork();
	const rowTwo: any = em2.create(PgIntegration, {name: 'row-two', amount: 7});
	await em2.persist(rowTwo).flush();

	const found: any[] = await backend.find({amount: {$gte: 5}}, {}, {}, {id: 1}, []);
	assert.equal(found.length, 1, '$gte filter');
	assert.equal(found[0].name, 'row-two', 'find returns plain objects');

	const total: number = await backend.count({});
	assert.equal(total, 2, 'count');

	const byId: any = await backend.findById(String(row.id), {}, []);
	assert.equal(byId.name, 'row-one-renamed', 'findById coerces text pk');

	console.log('[integration] 4b. Client-shaped search queries ($regex/$options, PCRE hex escapes, $expr number cast)');
	const insensitive: any[] = await backend.find({name: {$regex: 'ROW\\x2dTWO', $options: 'i'}}, {}, {}, {id: 1}, []);
	assert.equal(insensitive.length, 1, '$regex with $options i and PCRE hex escape matches');
	assert.equal(insensitive[0].name, 'row-two', '$regex match returns the right row');

	const anchored: any[] = await backend.find({name: {$regex: '^row\\x2dtwo$', $options: 'i'}}, {}, {}, {id: 1}, []);
	assert.equal(anchored.length, 1, 'anchored exact-match $regex works');

	const noMatch: any[] = await backend.find({name: {$regex: 'nosuchvalue', $options: 'i'}}, {}, {}, {id: 1}, []);
	assert.equal(noMatch.length, 0, 'non-matching $regex returns empty');

	const quickSearchShaped: any[] = await backend.find(
		{$or: [{$expr: {$regexMatch: {input: {$toString: '$amount'}, regex: '7'}}}, {name: {$regex: '7', $options: 'i'}}]},
		{},
		{},
		{id: 1},
		[]
	);
	assert.equal(quickSearchShaped.length, 1, 'quick-search shaped $or with $expr number cast');
	assert.equal(quickSearchShaped[0].amount, 7, 'number cast partial match finds the row');

	const distinctNames: any[] = await backend.distinct('name', {name: {$regex: 'row', $options: 'i'}});
	assert.equal(distinctNames.length, 2, 'distinct with $regex query');

	console.log('[integration] 5. DELETE -> notification without refetch');
	await em.remove(row).flush();

	await waitFor(() => changes.some((c) => 'delete' === c.operationType), 'normalized delete event');
	const deleteChange: any = changes.find((c) => 'delete' === c.operationType);
	assert.equal(String(deleteChange.documentKey._id), String(insertChange.documentKey._id), 'delete documentKey');
	assert.equal(deleteChange.fullDocument, undefined, 'delete has no fullDocument');

	console.log('[integration] 6. Trigger bootstrap is idempotent (CREATE OR REPLACE, second run)');
	await installPostgresTriggers(orm, [PgIntegration], CHANNEL);

	console.log('[integration] 7. Cleanup');
	await dropTable();
	await PostgresConnector.close();
};

const main = async (): Promise<void> => {
	let embedded: any;
	if (EXTERNAL) {
		console.log(`[integration] target: external ${USER}@${HOST}:${PORT}/${DBNAME}`);
	} else {
		console.log(`[integration] target: embedded PostgreSQL on port ${PORT} (self-contained, throwaway)`);
		embedded = await startEmbeddedPostgres();
	}

	try {
		await run();
		console.log('[integration] PASS: init, schema sync, triggers, LISTEN/NOTIFY, enrichment, queries, delete, idempotency');
	} finally {
		if (embedded) await embedded.stop();
	}
};

main()
	.then((): void => process.exit(0))
	.catch((error: any): void => {
		console.error('[integration] FAIL:', error);
		process.exit(1);
	});
