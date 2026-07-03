import PostgresObservableTable from './observable.table';
import PostgresListener from '../postgres.listener';
declare class PostgresObservableTablesMap {
    static init(): PostgresObservableTablesMap;
    static get(orm: any, entity: any, listener: PostgresListener): PostgresObservableTable;
    static clear(): void;
    private static _instance;
    private readonly _map;
    private constructor();
}
export default PostgresObservableTablesMap;
