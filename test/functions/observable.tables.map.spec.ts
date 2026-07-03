'use strict';

import {ReplaySubject, Subject} from 'rxjs';

import PostgresObservableTable from '../../src/functions/observable.table';
import PostgresObservableTablesMap from '../../src/functions/observable.tables.map';

class UserEntity {}
class NoteEntity {}

describe('observable.tables.map tests', () => {
	const metas: any = {
		UserEntity: {tableName: 'users', primaryKeys: ['id'], properties: {id: {type: 'number'}}, props: [{name: 'id', fieldNames: ['id']}]},
		NoteEntity: {tableName: 'notes', primaryKeys: ['id'], properties: {id: {type: 'number'}}, props: [{name: 'id', fieldNames: ['id']}]}
	};

	const createOrm = (): any => ({
		getMetadata: (): any => ({get: (name: string): any => metas[name]}),
		em: {fork: jest.fn()}
	});

	const createListener = (): any => ({
		notifications: new Subject<any>(),
		lifecycle: new ReplaySubject<any>(1)
	});

	it('should tolerate clear before initialization', () => {
		expect(() => PostgresObservableTablesMap.clear()).not.toThrow();
	});

	it('should return the same singleton from init', () => {
		expect(PostgresObservableTablesMap.init()).toBe(PostgresObservableTablesMap.init());
	});

	it('should create one observable table per table name', () => {
		PostgresObservableTablesMap.clear();
		const orm: any = createOrm();
		const listener: any = createListener();

		const users: PostgresObservableTable = PostgresObservableTablesMap.get(orm, UserEntity, listener);
		const notes: PostgresObservableTable = PostgresObservableTablesMap.get(orm, NoteEntity, listener);

		expect(users).toBeInstanceOf(PostgresObservableTable);
		expect(users.tableName).toBe('users');
		expect(notes.tableName).toBe('notes');
		expect(users).not.toBe(notes);
		expect(PostgresObservableTablesMap.get(orm, UserEntity, listener)).toBe(users);
	});

	it('should create a fresh observable table after clear', () => {
		PostgresObservableTablesMap.clear();
		const orm: any = createOrm();
		const listener: any = createListener();

		const before: PostgresObservableTable = PostgresObservableTablesMap.get(orm, UserEntity, listener);
		PostgresObservableTablesMap.clear();
		const after: PostgresObservableTable = PostgresObservableTablesMap.get(orm, UserEntity, listener);

		expect(after).toBeInstanceOf(PostgresObservableTable);
		expect(after).not.toBe(before);
	});
});
