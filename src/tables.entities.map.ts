'use strict';

export default class PostgresTablesEntitiesMap {
	public static addTableToEntityMapping(tableName: string, entity: any): void {
		PostgresTablesEntitiesMap._entities.set(tableName, entity);
	}

	public static getEntityByTable(tableName: string): any | null {
		return PostgresTablesEntitiesMap._entities.get(tableName) ?? null;
	}

	public static keys(): string[] {
		return Array.from(PostgresTablesEntitiesMap._entities.keys());
	}

	public static values(): any[] {
		return Array.from(PostgresTablesEntitiesMap._entities.values());
	}

	public static clear(): void {
		PostgresTablesEntitiesMap._entities.clear();
	}

	private static readonly _entities: Map<string, any> = new Map<string, any>();

	private constructor() {}
}
