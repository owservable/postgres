'use strict';

import {Client} from 'pg';
import {MikroORM} from '@mikro-orm/postgresql';
import {BackendRegistry} from '@owservable/core';

import PostgresConnector from '../src/postgres.connector';
import PostgresListener from '../src/postgres.listener';
import PostgresBackend from '../src/postgres.backend';
import PostgresTablesEntitiesMap from '../src/tables.entities.map';
import PostgresObservableTablesMap from '../src/functions/observable.tables.map';
import {PostgresLiveUpdatesRegistry} from '../src/decorators/live.updates';

jest.mock('pg', () => ({Client: jest.fn()}));
jest.mock('@mikro-orm/postgresql', () => ({MikroORM: {init: jest.fn()}}));
jest.mock('@owservable/core', () => ({
	BackendRegistry: jest.requireActual('@owservable/core/lib/backend/backend.registry').default
}));

const ClientMock: jest.Mock = Client as unknown as jest.Mock;
const InitMock: jest.Mock = MikroORM.init as unknown as jest.Mock;

const LOCK_KEY: number = 776277001;

class UserEntity {}
class NoteEntity {}

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('postgres.connector tests', () => {
	let clients: any[];
	let execute: jest.Mock;
	let mockOrm: any;
	let logSpy: jest.SpyInstance;

	const metas: any = {
		UserEntity: {
			tableName: 'users',
			primaryKeys: ['id'],
			properties: {id: {type: 'number', fieldNames: ['id']}},
			props: [{name: 'id', fieldNames: ['id']}]
		},
		NoteEntity: {
			tableName: 'notes',
			primaryKeys: ['id'],
			properties: {id: {type: 'number', fieldNames: ['id']}},
			props: [{name: 'id', fieldNames: ['id']}]
		}
	};

	const baseOptions = (): any => ({
		entities: [UserEntity, NoteEntity],
		host: 'localhost',
		port: 5432,
		user: 'u',
		password: 'p',
		dbName: 'db'
	});

	const createFakeClient = (): any => {
		const client: any = {
			on: jest.fn(),
			connect: jest.fn().mockResolvedValue(undefined),
			query: jest.fn().mockResolvedValue(undefined),
			end: jest.fn().mockResolvedValue(undefined),
			removeAllListeners: jest.fn()
		};
		clients.push(client);
		return client;
	};

	const lockQueries = (): string[] => clients.flatMap((client: any): string[] => client.query.mock.calls.map((call: any[]): string => call[0]));

	beforeEach(() => {
		clients = [];
		ClientMock.mockImplementation(createFakeClient);
		execute = jest.fn().mockResolvedValue(undefined);
		mockOrm = {
			schema: {update: jest.fn().mockResolvedValue(undefined)},
			getMetadata: (): any => ({get: (name: string): any => metas[name]}),
			em: {fork: jest.fn((): any => 'forked-em'), getConnection: (): any => ({execute})},
			close: jest.fn().mockResolvedValue(undefined)
		};
		InitMock.mockResolvedValue(mockOrm);
		BackendRegistry.clear();
		PostgresLiveUpdatesRegistry.clear();
		PostgresTablesEntitiesMap.clear();
		PostgresObservableTablesMap.clear();
		logSpy = jest.spyOn(console, 'log').mockImplementation((): undefined => undefined);
		jest.spyOn(console, 'warn').mockImplementation((): undefined => undefined);
		jest.spyOn(console, 'info').mockImplementation((): undefined => undefined);
		jest.spyOn(console, 'error').mockImplementation((): undefined => undefined);
	});

	afterEach(async () => {
		await PostgresConnector.close();
		jest.restoreAllMocks();
	});

	it('should be instantiable only through its static API', () => {
		expect(new (PostgresConnector as any)()).toBeInstanceOf(PostgresConnector);
	});

	it('should return undefined from orm and em before init', () => {
		expect(PostgresConnector.orm).toBeUndefined();
		expect(PostgresConnector.em()).toBeUndefined();
	});

	it('should initialize the orm, sync the schema under an advisory lock and register backends', async () => {
		PostgresLiveUpdatesRegistry.add(UserEntity);

		const orm: any = await PostgresConnector.init(baseOptions());
		await flush();

		expect(orm).toBe(mockOrm);
		expect(InitMock).toHaveBeenCalledWith({
			entities: [UserEntity, NoteEntity],
			host: 'localhost',
			port: 5432,
			user: 'u',
			password: 'p',
			dbName: 'db'
		});
		expect(mockOrm.schema.update).toHaveBeenCalledWith({safe: true});
		expect(logSpy).toHaveBeenCalledWith('[@owservable/postgres] -> PostgreSQL schema synchronized', '(safe mode)');

		const lock: any = clients[0];
		expect(ClientMock).toHaveBeenCalledWith({host: 'localhost', port: 5432, user: 'u', password: 'p', database: 'db'});
		expect(lock.connect).toHaveBeenCalledTimes(1);
		expect(lock.query).toHaveBeenCalledWith('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
		expect(lock.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
		expect(lock.end).toHaveBeenCalledTimes(1);

		const sqls: string[] = execute.mock.calls.map((call: any[]): string => call[0]);
		expect(sqls).toHaveLength(2);
		expect(sqls[0]).toContain("'owservable'");
		expect(sqls[1]).toContain('"users_owservable_notify"');

		expect(PostgresListener.instance.channel).toBe('owservable');

		expect(BackendRegistry.get('users')).toBeInstanceOf(PostgresBackend);
		expect(BackendRegistry.get('notes')).toBeInstanceOf(PostgresBackend);
		expect((BackendRegistry.get('users') as PostgresBackend).entity).toBe(UserEntity);
		expect(PostgresTablesEntitiesMap.getEntityByTable('users')).toBe(UserEntity);
		expect(PostgresTablesEntitiesMap.getEntityByTable('notes')).toBe(NoteEntity);

		expect(PostgresConnector.orm).toBe(mockOrm);
		expect(PostgresConnector.em()).toBe('forked-em');
	});

	it('should thread ssl into the orm, the schema lock client and the listener', async () => {
		const ssl: any = {rejectUnauthorized: false};

		await PostgresConnector.init({...baseOptions(), ssl});
		await flush();

		expect(InitMock).toHaveBeenCalledWith(expect.objectContaining({driverOptions: {ssl}}));
		expect(ClientMock).toHaveBeenCalledWith({host: 'localhost', port: 5432, user: 'u', password: 'p', database: 'db', ssl});
	});

	it('should omit ssl everywhere when not configured', async () => {
		await PostgresConnector.init(baseOptions());
		await flush();

		expect(InitMock).toHaveBeenCalledWith(expect.not.objectContaining({driverOptions: expect.anything()}));
		expect(ClientMock).toHaveBeenCalledWith(expect.not.objectContaining({ssl: expect.anything()}));
	});

	it('should return the existing orm on subsequent init calls', async () => {
		const orm: any = await PostgresConnector.init(baseOptions());
		InitMock.mockClear();

		const again: any = await PostgresConnector.init(baseOptions());

		expect(again).toBe(orm);
		expect(InitMock).not.toHaveBeenCalled();
	});

	it('should honor custom channel, unsafe schema sync and orm options', async () => {
		PostgresLiveUpdatesRegistry.add(NoteEntity);

		await PostgresConnector.init({
			...baseOptions(),
			channel: 'custom_channel',
			updateSchema: true,
			safe: false,
			triggers: true,
			ormOptions: {pool: {min: 1}}
		});

		expect(InitMock).toHaveBeenCalledWith(expect.objectContaining({pool: {min: 1}}));
		expect(mockOrm.schema.update).toHaveBeenCalledWith({safe: false});
		expect(logSpy).toHaveBeenCalledWith('[@owservable/postgres] -> PostgreSQL schema synchronized', '');

		const sqls: string[] = execute.mock.calls.map((call: any[]): string => call[0]);
		expect(sqls[0]).toContain("'custom_channel'");
		expect(sqls[1]).toContain('"notes_owservable_notify"');
		expect(PostgresListener.instance.channel).toBe('custom_channel');
	});

	it('should skip schema sync but still install triggers when updateSchema is false', async () => {
		PostgresLiveUpdatesRegistry.add(UserEntity);

		await PostgresConnector.init({...baseOptions(), updateSchema: false, triggers: true});

		expect(mockOrm.schema.update).not.toHaveBeenCalled();
		expect(execute).toHaveBeenCalled();
		expect(lockQueries()).toContain('SELECT pg_advisory_lock($1)');
	});

	it('should sync the schema but skip triggers when triggers is false', async () => {
		PostgresLiveUpdatesRegistry.add(UserEntity);

		await PostgresConnector.init({...baseOptions(), updateSchema: true, triggers: false});

		expect(mockOrm.schema.update).toHaveBeenCalledWith({safe: true});
		expect(execute).not.toHaveBeenCalled();
	});

	it('should skip the advisory lock when both updateSchema and triggers are false', async () => {
		await PostgresConnector.init({...baseOptions(), updateSchema: false, triggers: false});

		expect(mockOrm.schema.update).not.toHaveBeenCalled();
		expect(execute).not.toHaveBeenCalled();
		expect(lockQueries()).not.toContain('SELECT pg_advisory_lock($1)');
		expect(BackendRegistry.get('users')).toBeInstanceOf(PostgresBackend);
	});

	it('should release the advisory lock even when the schema sync fails', async () => {
		mockOrm.schema.update.mockRejectedValue(new Error('sync failed'));

		await expect(PostgresConnector.init(baseOptions())).rejects.toThrow('sync failed');

		const lock: any = clients[0];
		expect(lock.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
		expect(lock.end).toHaveBeenCalledTimes(1);
		expect(PostgresConnector.orm).toBeFalsy();
	});

	it('should stop the listener and close the orm on close', async () => {
		await PostgresConnector.init(baseOptions());
		await flush();
		expect(PostgresListener.instance).toBeDefined();

		await PostgresConnector.close();

		expect(mockOrm.close).toHaveBeenCalledTimes(1);
		expect(PostgresConnector.orm).toBeNull();
		expect(PostgresConnector.em()).toBeUndefined();
		expect(PostgresListener.instance).toBeNull();

		await expect(PostgresConnector.close()).resolves.toBeUndefined();
		expect(mockOrm.close).toHaveBeenCalledTimes(1);
	});
});
