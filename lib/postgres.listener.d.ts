import { ReplaySubject, Subject } from 'rxjs';
import type { LifecycleEvent } from '@owservable/core';
export type PostgresNotificationType = {
    table: string;
    op: 'insert' | 'update' | 'delete' | string;
    id: string;
    changed?: string[];
};
export default class PostgresListener {
    static init(config: any, channel?: string): PostgresListener;
    static get instance(): PostgresListener;
    static stop(): Promise<void>;
    readonly notifications: Subject<PostgresNotificationType>;
    readonly lifecycle: ReplaySubject<LifecycleEvent>;
    private static _instance;
    private readonly _config;
    private readonly _channel;
    private _client;
    private _stopped;
    private _reconnectDelay;
    private constructor();
    get channel(): string;
    private _connect;
    private _handleFailure;
    private _stop;
}
