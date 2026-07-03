import { Subject } from 'rxjs';
import PostgresListener from '../postgres.listener';
declare class PostgresObservableTable extends Subject<any> {
    private readonly _orm;
    private readonly _entity;
    private readonly _tableName;
    private readonly _pkProperty;
    private readonly _pkIsNumeric;
    private readonly _columnsToProperties;
    constructor(orm: any, entity: any, listener: PostgresListener);
    get tableName(): string;
    get pkProperty(): string;
    coercePrimaryKey(id: string): any;
    private _process;
}
export default PostgresObservableTable;
