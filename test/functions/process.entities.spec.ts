'use strict';

import * as path from 'node:path';

import processEntities from '../../src/functions/process.entities';

const fixtures: string = path.join(__dirname, 'fixtures');

const names = (entities: any[]): string[] => entities.map((entity: any): string => entity.name).sort();

describe('process.entities tests', () => {
	it('should collect entities recursively using the default folder name', () => {
		const entities: any[] = processEntities(path.join(fixtures, 'good'));
		expect(names(entities)).toEqual(['HelperEntity', 'NoteEntity', 'Skipped2Entity', 'SkippedEntity', 'UserEntity']);
	});

	it('should exclude folders matching a string suffix', () => {
		const entities: any[] = processEntities(path.join(fixtures, 'good'), 'entities', 'skipme');
		expect(names(entities)).toEqual(['HelperEntity', 'NoteEntity', 'Skipped2Entity', 'UserEntity']);
	});

	it('should exclude folders matching any suffix in an array', () => {
		const entities: any[] = processEntities(path.join(fixtures, 'good'), 'entities', ['skipme', 'skipme2']);
		expect(names(entities)).toEqual(['HelperEntity', 'NoteEntity', 'UserEntity']);
	});

	it('should keep all entities when the array exclude matches nothing', () => {
		const entities: any[] = processEntities(path.join(fixtures, 'good'), 'entities', ['nomatch']);
		expect(names(entities)).toEqual(['HelperEntity', 'NoteEntity', 'Skipped2Entity', 'SkippedEntity', 'UserEntity']);
	});

	it('should return nothing when the entities folder itself is excluded', () => {
		const entities: any[] = processEntities(path.join(fixtures, 'good'), 'entities', 'entities');
		expect(entities).toEqual([]);
	});

	it('should throw when a file has no default export', () => {
		expect(() => processEntities(path.join(fixtures, 'bad'))).toThrow(/Entity not found in/);
	});

	it('should return an empty array when no folders match the name', () => {
		expect(processEntities(path.join(fixtures, 'good'), 'nonexistent')).toEqual([]);
	});
});
