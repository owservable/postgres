'use strict';

import {ReplaySubject, Subject} from 'rxjs';

import ObservableTable from '../../src/functions/observable.table';
import ObservableTablesMap from '../../src/functions/observable.tables.map';

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
		expect(() => ObservableTablesMap.clear()).not.toThrow();
	});

	it('should return the same singleton from init', () => {
		expect(ObservableTablesMap.init()).toBe(ObservableTablesMap.init());
	});

	it('should create one observable table per table name', () => {
		ObservableTablesMap.clear();
		const orm: any = createOrm();
		const listener: any = createListener();

		const users: ObservableTable = ObservableTablesMap.get(orm, UserEntity, listener);
		const notes: ObservableTable = ObservableTablesMap.get(orm, NoteEntity, listener);

		expect(users).toBeInstanceOf(ObservableTable);
		expect(users.tableName).toBe('users');
		expect(notes.tableName).toBe('notes');
		expect(users).not.toBe(notes);
		expect(ObservableTablesMap.get(orm, UserEntity, listener)).toBe(users);
	});

	it('should create a fresh observable table after clear', () => {
		ObservableTablesMap.clear();
		const orm: any = createOrm();
		const listener: any = createListener();

		const before: ObservableTable = ObservableTablesMap.get(orm, UserEntity, listener);
		ObservableTablesMap.clear();
		const after: ObservableTable = ObservableTablesMap.get(orm, UserEntity, listener);

		expect(after).toBeInstanceOf(ObservableTable);
		expect(after).not.toBe(before);
	});
});
