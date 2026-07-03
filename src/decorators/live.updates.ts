'use strict';

export class LiveUpdatesRegistry {
	public static add(entity: any): void {
		LiveUpdatesRegistry._entities.add(entity);
	}

	public static has(entity: any): boolean {
		return LiveUpdatesRegistry._entities.has(entity);
	}

	public static entities(): any[] {
		return Array.from(LiveUpdatesRegistry._entities);
	}

	public static clear(): void {
		LiveUpdatesRegistry._entities.clear();
	}

	private static readonly _entities: Set<any> = new Set<any>();

	private constructor() {}
}

const LiveUpdates = (): ClassDecorator => {
	return (target: any): void => {
		LiveUpdatesRegistry.add(target);
	};
};
export default LiveUpdates;
