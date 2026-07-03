'use strict';

export class PostgresLiveUpdatesRegistry {
	public static add(entity: any): void {
		PostgresLiveUpdatesRegistry._entities.add(entity);
	}

	public static has(entity: any): boolean {
		return PostgresLiveUpdatesRegistry._entities.has(entity);
	}

	public static entities(): any[] {
		return Array.from(PostgresLiveUpdatesRegistry._entities);
	}

	public static clear(): void {
		PostgresLiveUpdatesRegistry._entities.clear();
	}

	private static readonly _entities: Set<any> = new Set<any>();

	private constructor() {}
}

const PostgresLiveUpdates = (): ClassDecorator => {
	return (target: any): void => {
		PostgresLiveUpdatesRegistry.add(target);
	};
};
export default PostgresLiveUpdates;
