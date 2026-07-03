'use strict';

import {Client} from 'pg';
import {MikroORM} from '@mikro-orm/postgresql';

import {BackendRegistry} from '@owservable/core';

import PostgresBackend from './postgres.backend';
import PostgresListener from './postgres.listener';
import TablesEntitiesMap from './tables.entities.map';
import installTriggers from './functions/install.triggers';
import {LiveUpdatesRegistry} from './decorators/live.updates';

const SCHEMA_SYNC_LOCK_KEY: number = 776277001;

export type PostgresConnectorOptionsType = {
	entities: any[];
	host: string;
	port: number;
	user: string;
	password: string;
	dbName: string;

	channel?: string;
	updateSchema?: boolean;
	safe?: boolean;
	triggers?: boolean;
	ormOptions?: any;
};

export default class PostgresConnector {
	public static async init(options: PostgresConnectorOptionsType): Promise<any> {
		if (PostgresConnector._orm) return PostgresConnector._orm;

		const {entities, host, port, user, password, dbName, channel = 'owservable', updateSchema = true, safe = true, triggers = true, ormOptions = {}} = options;

		const orm: any = await MikroORM.init({
			entities,
			host,
			port,
			user,
			password,
			dbName,
			...ormOptions
		});
		console.log('[@owservable/postgres] -> PostgreSQL connected to', `${host}:${port}/${dbName}`);

		if (updateSchema || triggers) {
			await PostgresConnector._withSchemaLock({host, port, user, password, database: dbName}, async (): Promise<void> => {
				if (updateSchema) {
					await orm.schema.updateSchema({safe});
					console.log('[@owservable/postgres] -> PostgreSQL schema synchronized', safe ? '(safe mode)' : '');
				}
				if (triggers) {
					const liveEntities: any[] = entities.filter((entity: any): boolean => LiveUpdatesRegistry.has(entity));
					await installTriggers(orm, liveEntities, channel);
				}
			});
		}

		const listener: PostgresListener = PostgresListener.init({host, port, user, password, database: dbName}, channel);

		for (const entity of entities) {
			const meta: any = orm.getMetadata().get(entity.name);
			const tableName: string = meta.tableName;

			TablesEntitiesMap.addTableToEntityMapping(tableName, entity);
			BackendRegistry.register(tableName, new PostgresBackend(orm, entity, listener));
		}

		PostgresConnector._orm = orm;
		return orm;
	}

	public static get orm(): any {
		return PostgresConnector._orm;
	}

	public static em(): any {
		return PostgresConnector._orm?.em.fork();
	}

	public static async close(): Promise<void> {
		await PostgresListener.stop();
		if (PostgresConnector._orm) {
			await PostgresConnector._orm.close();
			PostgresConnector._orm = null;
		}
	}

	private static _orm: any;

	private static async _withSchemaLock(config: any, execute: () => Promise<void>): Promise<void> {
		const lockClient: Client = new Client(config);
		await lockClient.connect();
		try {
			await lockClient.query('SELECT pg_advisory_lock($1)', [SCHEMA_SYNC_LOCK_KEY]);
			await execute();
		} finally {
			try {
				await lockClient.query('SELECT pg_advisory_unlock($1)', [SCHEMA_SYNC_LOCK_KEY]);
			} finally {
				await lockClient.end();
			}
		}
	}

	private constructor() {}
}
