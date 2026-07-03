'use strict';

import PostgresLiveUpdates, {PostgresLiveUpdatesRegistry} from '../../src/decorators/live.updates';

describe('live.updates tests', () => {
	beforeEach(() => {
		PostgresLiveUpdatesRegistry.clear();
	});

	it('should register a class through the decorator', () => {
		class UserEntity {}

		const decorate: ClassDecorator = PostgresLiveUpdates();
		decorate(UserEntity as any);

		expect(PostgresLiveUpdatesRegistry.has(UserEntity)).toBe(true);
		expect(PostgresLiveUpdatesRegistry.entities()).toEqual([UserEntity]);
	});

	it('should report false for unregistered classes', () => {
		class NoteEntity {}

		expect(PostgresLiveUpdatesRegistry.has(NoteEntity)).toBe(false);
		expect(PostgresLiveUpdatesRegistry.entities()).toEqual([]);
	});

	it('should deduplicate entities added directly to the registry', () => {
		class TagEntity {}

		PostgresLiveUpdatesRegistry.add(TagEntity);
		PostgresLiveUpdates()(TagEntity);

		expect(PostgresLiveUpdatesRegistry.has(TagEntity)).toBe(true);
		expect(PostgresLiveUpdatesRegistry.entities()).toEqual([TagEntity]);
	});

	it('should be instantiable only through its static API', () => {
		expect(new (PostgresLiveUpdatesRegistry as any)()).toBeInstanceOf(PostgresLiveUpdatesRegistry);
	});

	it('should clear the registry', () => {
		class TagEntity {}

		PostgresLiveUpdatesRegistry.add(TagEntity);
		PostgresLiveUpdatesRegistry.clear();

		expect(PostgresLiveUpdatesRegistry.has(TagEntity)).toBe(false);
		expect(PostgresLiveUpdatesRegistry.entities()).toEqual([]);
	});
});
