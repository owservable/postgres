'use strict';

export default class TablesEntitiesMap {
	public static addTableToEntityMapping(tableName: string, entity: any): void {
		TablesEntitiesMap._entities.set(tableName, entity);
	}

	public static getEntityByTable(tableName: string): any | null {
		return TablesEntitiesMap._entities.get(tableName) ?? null;
	}

	public static keys(): string[] {
		return Array.from(TablesEntitiesMap._entities.keys());
	}

	public static values(): any[] {
		return Array.from(TablesEntitiesMap._entities.values());
	}

	public static clear(): void {
		TablesEntitiesMap._entities.clear();
	}

	private static readonly _entities: Map<string, any> = new Map<string, any>();

	private constructor() {}
}
