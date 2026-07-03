'use strict';

import OwservablePostgres, {
	PostgresBackend,
	PostgresConnector,
	PostgresListener,
	TablesEntitiesMap,
	LiveUpdates,
	LiveUpdatesRegistry,
	ObservableTable,
	ObservableTablesMap,
	installTriggers,
	processEntities
} from '../src/owservable.postgres';

import PostgresBackendDirect from '../src/postgres.backend';
import PostgresConnectorDirect from '../src/postgres.connector';
import PostgresListenerDirect from '../src/postgres.listener';
import TablesEntitiesMapDirect from '../src/tables.entities.map';
import LiveUpdatesDirect, {LiveUpdatesRegistry as LiveUpdatesRegistryDirect} from '../src/decorators/live.updates';
import ObservableTableDirect from '../src/functions/observable.table';
import ObservableTablesMapDirect from '../src/functions/observable.tables.map';
import installTriggersDirect from '../src/functions/install.triggers';
import processEntitiesDirect from '../src/functions/process.entities';

jest.mock('@owservable/core', () => ({
	BackendRegistry: jest.requireActual('@owservable/core/lib/backend/backend.registry').default
}));

describe('owservable.postgres tests', () => {
	it('should re-export all modules', () => {
		expect(PostgresBackend).toBe(PostgresBackendDirect);
		expect(PostgresConnector).toBe(PostgresConnectorDirect);
		expect(PostgresListener).toBe(PostgresListenerDirect);
		expect(TablesEntitiesMap).toBe(TablesEntitiesMapDirect);
		expect(LiveUpdates).toBe(LiveUpdatesDirect);
		expect(LiveUpdatesRegistry).toBe(LiveUpdatesRegistryDirect);
		expect(ObservableTable).toBe(ObservableTableDirect);
		expect(ObservableTablesMap).toBe(ObservableTablesMapDirect);
		expect(installTriggers).toBe(installTriggersDirect);
		expect(processEntities).toBe(processEntitiesDirect);
	});

	it('should export an empty default object', () => {
		expect(OwservablePostgres).toEqual({});
	});
});
