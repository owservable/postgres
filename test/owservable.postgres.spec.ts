'use strict';

import OwservablePostgres, {
	PostgresBackend,
	PostgresConnector,
	PostgresListener,
	PostgresTablesEntitiesMap,
	PostgresLiveUpdates,
	PostgresLiveUpdatesRegistry,
	PostgresObservableTable,
	PostgresObservableTablesMap,
	installPostgresTriggers,
	processPostgresEntities
} from '../src/owservable.postgres';

import PostgresBackendDirect from '../src/postgres.backend';
import PostgresConnectorDirect from '../src/postgres.connector';
import PostgresListenerDirect from '../src/postgres.listener';
import TablesEntitiesMapDirect from '../src/tables.entities.map';
import LiveUpdatesDirect, {PostgresLiveUpdatesRegistry as LiveUpdatesRegistryDirect} from '../src/decorators/live.updates';
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
		expect(PostgresTablesEntitiesMap).toBe(TablesEntitiesMapDirect);
		expect(PostgresLiveUpdates).toBe(LiveUpdatesDirect);
		expect(PostgresLiveUpdatesRegistry).toBe(LiveUpdatesRegistryDirect);
		expect(PostgresObservableTable).toBe(ObservableTableDirect);
		expect(PostgresObservableTablesMap).toBe(ObservableTablesMapDirect);
		expect(installPostgresTriggers).toBe(installTriggersDirect);
		expect(processPostgresEntities).toBe(processEntitiesDirect);
	});

	it('should export an empty default object', () => {
		expect(OwservablePostgres).toEqual({});
	});
});
