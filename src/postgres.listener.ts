'use strict';

import {Client} from 'pg';
import {ReplaySubject, Subject} from 'rxjs';

import type {LifecycleEvent} from '@owservable/core';

export type PostgresNotificationType = {
	table: string;
	op: 'insert' | 'update' | 'delete' | string;
	id: string;
	changed?: string[];
};

const RECONNECT_INITIAL_DELAY: number = 1000;
const RECONNECT_MAX_DELAY: number = 30000;

export default class PostgresListener {
	public static init(config: any, channel: string = 'owservable'): PostgresListener {
		if (!PostgresListener._instance) PostgresListener._instance = new PostgresListener(config, channel);
		return PostgresListener._instance;
	}

	public static get instance(): PostgresListener {
		return PostgresListener._instance;
	}

	public static async stop(): Promise<void> {
		if (!PostgresListener._instance) return;
		await PostgresListener._instance._stop();
		PostgresListener._instance = null;
	}

	public readonly notifications: Subject<PostgresNotificationType>;
	public readonly lifecycle: ReplaySubject<LifecycleEvent>;

	private static _instance: PostgresListener;

	private readonly _config: any;
	private readonly _channel: string;
	private _client: Client;
	private _stopped: boolean = false;
	private _reconnectDelay: number = RECONNECT_INITIAL_DELAY;

	private constructor(config: any, channel: string) {
		this._config = config;
		this._channel = channel;
		this.notifications = new Subject<PostgresNotificationType>();
		this.lifecycle = new ReplaySubject<LifecycleEvent>(1);

		this._connect() //
			.then((): null => null)
			.catch((error: any): void => this._handleFailure(error));
	}

	public get channel(): string {
		return this._channel;
	}

	private async _connect(): Promise<void> {
		this._client = new Client(this._config);

		this._client.on('notification', (message: any): void => {
			try {
				const notification: PostgresNotificationType = JSON.parse(message.payload);
				this.notifications.next(notification);
			} catch (error) {
				console.error(`[@owservable/postgres] -> PostgresListener[${this._channel}] Error parsing notification payload:`, message?.payload, error);
			}
		});

		this._client.on('error', (error: any): void => {
			console.error(`[@owservable/postgres] -> PostgresListener[${this._channel}] connection error:`, error, ', attempting reconnection...');
			this._handleFailure(error);
		});

		this._client.on('end', (): void => {
			if (this._stopped) return;
			console.warn(`[@owservable/postgres] -> PostgresListener[${this._channel}] connection ended, attempting reconnection...`);
			this._handleFailure();
		});

		await this._client.connect();
		await this._client.query(`LISTEN "${this._channel}"`);

		this._reconnectDelay = RECONNECT_INITIAL_DELAY;
		this.lifecycle.next({
			type: 'live',
			collection: this._channel,
			timestamp: new Date()
		});
		console.log(`[@owservable/postgres] -> PostgresListener listening on channel "${this._channel}"`);
	}

	private _handleFailure(error?: any): void {
		if (this._stopped) return;

		this.lifecycle.next({
			type: 'error',
			collection: this._channel,
			timestamp: new Date(),
			error
		});

		try {
			this._client?.removeAllListeners();
			this._client?.end().catch((): null => null);
		} catch (cleanupError) {
			console.error(`[@owservable/postgres] -> PostgresListener[${this._channel}] Error cleaning up old client:`, cleanupError);
		}

		const delay: number = this._reconnectDelay;
		this._reconnectDelay = Math.min(this._reconnectDelay * 2, RECONNECT_MAX_DELAY);

		console.info(`[@owservable/postgres] -> PostgresListener[${this._channel}] Reconnecting in ${delay}ms...`);
		setTimeout((): void => {
			this._connect() //
				.then((): null => null)
				.catch((reconnectError: any): void => this._handleFailure(reconnectError));
		}, delay);
	}

	private async _stop(): Promise<void> {
		this._stopped = true;
		this.lifecycle.next({
			type: 'close',
			collection: this._channel,
			timestamp: new Date()
		});
		try {
			this._client?.removeAllListeners();
			await this._client?.end();
		} catch (error) {
			console.error(`[@owservable/postgres] -> PostgresListener[${this._channel}] Error stopping:`, error);
		}
	}
}
