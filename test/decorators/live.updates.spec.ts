'use strict';

import LiveUpdates, {LiveUpdatesRegistry} from '../../src/decorators/live.updates';

describe('live.updates tests', () => {
	beforeEach(() => {
		LiveUpdatesRegistry.clear();
	});

	it('should register a class through the decorator', () => {
		class UserEntity {}

		const decorate: ClassDecorator = LiveUpdates();
		decorate(UserEntity as any);

		expect(LiveUpdatesRegistry.has(UserEntity)).toBe(true);
		expect(LiveUpdatesRegistry.entities()).toEqual([UserEntity]);
	});

	it('should report false for unregistered classes', () => {
		class NoteEntity {}

		expect(LiveUpdatesRegistry.has(NoteEntity)).toBe(false);
		expect(LiveUpdatesRegistry.entities()).toEqual([]);
	});

	it('should deduplicate entities added directly to the registry', () => {
		class TagEntity {}

		LiveUpdatesRegistry.add(TagEntity);
		LiveUpdates()(TagEntity);

		expect(LiveUpdatesRegistry.has(TagEntity)).toBe(true);
		expect(LiveUpdatesRegistry.entities()).toEqual([TagEntity]);
	});

	it('should be instantiable only through its static API', () => {
		expect(new (LiveUpdatesRegistry as any)()).toBeInstanceOf(LiveUpdatesRegistry);
	});

	it('should clear the registry', () => {
		class TagEntity {}

		LiveUpdatesRegistry.add(TagEntity);
		LiveUpdatesRegistry.clear();

		expect(LiveUpdatesRegistry.has(TagEntity)).toBe(false);
		expect(LiveUpdatesRegistry.entities()).toEqual([]);
	});
});
