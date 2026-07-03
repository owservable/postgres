import ObservableTable from './observable.table';
import PostgresListener from '../postgres.listener';
declare class ObservableTablesMap {
    static init(): ObservableTablesMap;
    static get(orm: any, entity: any, listener: PostgresListener): ObservableTable;
    static clear(): void;
    private static _instance;
    private readonly _map;
    private constructor();
}
export default ObservableTablesMap;
