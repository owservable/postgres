'use strict';

import PostgresTablesEntitiesMap from '../src/tables.entities.map';

class UserEntity {}
class NoteEntity {}

describe('tables.entities.map tests', () => {
	beforeEach(() => {
		PostgresTablesEntitiesMap.clear();
	});

	it('should add and retrieve entities by table name', () => {
		PostgresTablesEntitiesMap.addTableToEntityMapping('users', UserEntity);
		PostgresTablesEntitiesMap.addTableToEntityMapping('notes', NoteEntity);
		expect(PostgresTablesEntitiesMap.getEntityByTable('users')).toBe(UserEntity);
		expect(PostgresTablesEntitiesMap.getEntityByTable('notes')).toBe(NoteEntity);
	});

	it('should return null for missing table names', () => {
		expect(PostgresTablesEntitiesMap.getEntityByTable('missing')).toBeNull();
	});

	it('should list keys and values', () => {
		PostgresTablesEntitiesMap.addTableToEntityMapping('users', UserEntity);
		PostgresTablesEntitiesMap.addTableToEntityMapping('notes', NoteEntity);
		expect(PostgresTablesEntitiesMap.keys()).toEqual(['users', 'notes']);
		expect(PostgresTablesEntitiesMap.values()).toEqual([UserEntity, NoteEntity]);
	});

	it('should overwrite an existing mapping', () => {
		PostgresTablesEntitiesMap.addTableToEntityMapping('users', UserEntity);
		PostgresTablesEntitiesMap.addTableToEntityMapping('users', NoteEntity);
		expect(PostgresTablesEntitiesMap.getEntityByTable('users')).toBe(NoteEntity);
		expect(PostgresTablesEntitiesMap.keys()).toEqual(['users']);
	});

	it('should be instantiable only through its static API', () => {
		expect(new (PostgresTablesEntitiesMap as any)()).toBeInstanceOf(PostgresTablesEntitiesMap);
	});

	it('should clear all mappings', () => {
		PostgresTablesEntitiesMap.addTableToEntityMapping('users', UserEntity);
		PostgresTablesEntitiesMap.clear();
		expect(PostgresTablesEntitiesMap.keys()).toEqual([]);
		expect(PostgresTablesEntitiesMap.values()).toEqual([]);
		expect(PostgresTablesEntitiesMap.getEntityByTable('users')).toBeNull();
	});
});
