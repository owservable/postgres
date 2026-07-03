'use strict';

import installPostgresTriggers from '../../src/functions/install.triggers';

class UserEntity {}
class NoteEntity {}
class TagEntity {}

describe('install.triggers tests', () => {
	let execute: jest.Mock;
	let orm: any;
	let logSpy: jest.SpyInstance;

	const metas: any = {
		UserEntity: {tableName: 'users', primaryKeys: ['id'], properties: {id: {fieldNames: ['user_id']}}},
		NoteEntity: {tableName: 'notes', primaryKeys: ['noteId'], properties: {noteId: {}}},
		TagEntity: {tableName: 'tags', primaryKeys: ['tagId'], properties: {}}
	};

	beforeEach(() => {
		execute = jest.fn().mockResolvedValue(undefined);
		orm = {
			em: {getConnection: (): any => ({execute})},
			getMetadata: (): any => ({get: (name: string): any => metas[name]})
		};
		logSpy = jest.spyOn(console, 'log').mockImplementation((): undefined => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should install the notify function with the default channel', async () => {
		await installPostgresTriggers(orm, []);

		expect(execute).toHaveBeenCalledTimes(1);
		const functionSql: string = execute.mock.calls[0][0];
		expect(functionSql).toContain('CREATE OR REPLACE FUNCTION owservable_notify()');
		expect(functionSql).toContain("'owservable'");
		expect(functionSql).toContain('pg_notify');
		expect(logSpy).not.toHaveBeenCalled();
	});

	it('should install the notify function with a custom channel', async () => {
		await installPostgresTriggers(orm, [], 'custom_channel');

		const functionSql: string = execute.mock.calls[0][0];
		expect(functionSql).toContain("'custom_channel'");
		expect(functionSql).toContain('pg_notify');
	});

	it('should install a trigger per entity using the pk column field name', async () => {
		await installPostgresTriggers(orm, [UserEntity]);

		expect(execute).toHaveBeenCalledTimes(2);
		const triggerSql: string = execute.mock.calls[1][0];
		expect(triggerSql).toContain('CREATE OR REPLACE TRIGGER "users_owservable_notify"');
		expect(triggerSql).toContain('AFTER INSERT OR UPDATE OR DELETE ON "users"');
		expect(triggerSql).toContain("owservable_notify('user_id')");
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('live updates enabled for table "users"'));
	});

	it('should fall back to the pk property when fieldNames are missing', async () => {
		await installPostgresTriggers(orm, [NoteEntity]);

		const triggerSql: string = execute.mock.calls[1][0];
		expect(triggerSql).toContain('"notes_owservable_notify"');
		expect(triggerSql).toContain("owservable_notify('noteId')");
	});

	it('should fall back to the pk property when the pk property metadata is missing', async () => {
		await installPostgresTriggers(orm, [TagEntity]);

		const triggerSql: string = execute.mock.calls[1][0];
		expect(triggerSql).toContain('"tags_owservable_notify"');
		expect(triggerSql).toContain("owservable_notify('tagId')");
	});

	it('should install triggers for multiple entities', async () => {
		await installPostgresTriggers(orm, [UserEntity, NoteEntity, TagEntity], 'chan');

		expect(execute).toHaveBeenCalledTimes(4);
		expect(execute.mock.calls[1][0]).toContain('"users"');
		expect(execute.mock.calls[2][0]).toContain('"notes"');
		expect(execute.mock.calls[3][0]).toContain('"tags"');
		expect(logSpy).toHaveBeenCalledTimes(3);
	});
});
