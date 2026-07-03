'use strict';

import PostgresObservableTable from './observable.table';
import PostgresListener from '../postgres.listener';

class PostgresObservableTablesMap {
	public static init(): PostgresObservableTablesMap {
		if (!PostgresObservableTablesMap._instance) PostgresObservableTablesMap._instance = new PostgresObservableTablesMap();
		return PostgresObservableTablesMap._instance;
	}

	public static get(orm: any, entity: any, listener: PostgresListener): PostgresObservableTable {
		const instance: PostgresObservableTablesMap = PostgresObservableTablesMap.init();
		const map: Map<string, PostgresObservableTable> = instance._map;

		const meta: any = orm.getMetadata().get(entity.name);
		const tableName: string = meta.tableName;
		if (!map.get(tableName)) map.set(tableName, new PostgresObservableTable(orm, entity, listener));

		return map.get(tableName);
	}

	public static clear(): void {
		if (PostgresObservableTablesMap._instance) PostgresObservableTablesMap._instance._map.clear();
	}

	private static _instance: PostgresObservableTablesMap;

	private readonly _map: Map<string, PostgresObservableTable>;

	private constructor() {
		this._map = new Map<string, PostgresObservableTable>();
	}
}
export default PostgresObservableTablesMap;
