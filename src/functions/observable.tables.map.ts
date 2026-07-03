'use strict';

import ObservableTable from './observable.table';
import PostgresListener from '../postgres.listener';

class ObservableTablesMap {
	public static init(): ObservableTablesMap {
		if (!ObservableTablesMap._instance) ObservableTablesMap._instance = new ObservableTablesMap();
		return ObservableTablesMap._instance;
	}

	public static get(orm: any, entity: any, listener: PostgresListener): ObservableTable {
		const instance: ObservableTablesMap = ObservableTablesMap.init();
		const map: Map<string, ObservableTable> = instance._map;

		const meta: any = orm.getMetadata().get(entity.name);
		const tableName: string = meta.tableName;
		if (!map.get(tableName)) map.set(tableName, new ObservableTable(orm, entity, listener));

		return map.get(tableName);
	}

	public static clear(): void {
		if (ObservableTablesMap._instance) ObservableTablesMap._instance._map.clear();
	}

	private static _instance: ObservableTablesMap;

	private readonly _map: Map<string, ObservableTable>;

	private constructor() {
		this._map = new Map<string, ObservableTable>();
	}
}
export default ObservableTablesMap;
