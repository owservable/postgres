'use strict';

import TablesEntitiesMap from '../src/tables.entities.map';

class UserEntity {}
class NoteEntity {}

describe('tables.entities.map tests', () => {
	beforeEach(() => {
		TablesEntitiesMap.clear();
	});

	it('should add and retrieve entities by table name', () => {
		TablesEntitiesMap.addTableToEntityMapping('users', UserEntity);
		TablesEntitiesMap.addTableToEntityMapping('notes', NoteEntity);
		expect(TablesEntitiesMap.getEntityByTable('users')).toBe(UserEntity);
		expect(TablesEntitiesMap.getEntityByTable('notes')).toBe(NoteEntity);
	});

	it('should return null for missing table names', () => {
		expect(TablesEntitiesMap.getEntityByTable('missing')).toBeNull();
	});

	it('should list keys and values', () => {
		TablesEntitiesMap.addTableToEntityMapping('users', UserEntity);
		TablesEntitiesMap.addTableToEntityMapping('notes', NoteEntity);
		expect(TablesEntitiesMap.keys()).toEqual(['users', 'notes']);
		expect(TablesEntitiesMap.values()).toEqual([UserEntity, NoteEntity]);
	});

	it('should overwrite an existing mapping', () => {
		TablesEntitiesMap.addTableToEntityMapping('users', UserEntity);
		TablesEntitiesMap.addTableToEntityMapping('users', NoteEntity);
		expect(TablesEntitiesMap.getEntityByTable('users')).toBe(NoteEntity);
		expect(TablesEntitiesMap.keys()).toEqual(['users']);
	});

	it('should be instantiable only through its static API', () => {
		expect(new (TablesEntitiesMap as any)()).toBeInstanceOf(TablesEntitiesMap);
	});

	it('should clear all mappings', () => {
		TablesEntitiesMap.addTableToEntityMapping('users', UserEntity);
		TablesEntitiesMap.clear();
		expect(TablesEntitiesMap.keys()).toEqual([]);
		expect(TablesEntitiesMap.values()).toEqual([]);
		expect(TablesEntitiesMap.getEntityByTable('users')).toBeNull();
	});
});
