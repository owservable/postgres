import { Observable } from 'rxjs';
import type { IObservableBackend } from '@owservable/core';
import PostgresListener from './postgres.listener';
export default class PostgresBackend implements IObservableBackend {
    private readonly _orm;
    private readonly _entity;
    private readonly _listener;
    private readonly _tableName;
    private readonly _pkProperty;
    constructor(orm: any, entity: any, listener: PostgresListener);
    target(): string;
    changes(): Observable<any>;
    find(query: any, fields: any, paging: any, sort: any, populates: any[]): Promise<any[]>;
    findOne(query: any, fields: any, populates: any[]): Promise<any>;
    findById(id: string, fields: any, populates: any[]): Promise<any>;
    count(query: any): Promise<number>;
    populate(document: any, _populate: any): Promise<any>;
    toJSON(document: any): any;
    resolveVirtuals(document: any, virtuals: string[]): Promise<any>;
    get entity(): any;
    private _observableTable;
    private _toObject;
    private _translateQuery;
    private _translateSort;
    private _translateFields;
    private _translatePopulates;
}
