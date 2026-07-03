'use strict';

import {Client} from 'pg';

import PostgresListener from '../src/postgres.listener';

jest.mock('pg', () => ({Client: jest.fn()}));

const ClientMock: jest.Mock = Client as unknown as jest.Mock;

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const FAKE_TIMER_OPTIONS: any = {doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate']};

describe('postgres.listener tests', () => {
	let clients: any[];
	let logSpy: jest.SpyInstance;
	let warnSpy: jest.SpyInstance;
	let infoSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	const createFakeClient = (): any => {
		const handlers: Record<string, (...args: any[]) => void> = {};
		const client: any = {
			handlers,
			connect: jest.fn().mockResolvedValue(undefined),
			query: jest.fn().mockResolvedValue(undefined),
			end: jest.fn().mockResolvedValue(undefined),
			removeAllListeners: jest.fn()
		};
		client.on = jest.fn((event: string, handler: (...args: any[]) => void): any => {
			handlers[event] = handler;
			return client;
		});
		clients.push(client);
		return client;
	};

	beforeEach(() => {
		clients = [];
		ClientMock.mockImplementation(createFakeClient);
		logSpy = jest.spyOn(console, 'log').mockImplementation((): undefined => undefined);
		warnSpy = jest.spyOn(console, 'warn').mockImplementation((): undefined => undefined);
		infoSpy = jest.spyOn(console, 'info').mockImplementation((): undefined => undefined);
		errorSpy = jest.spyOn(console, 'error').mockImplementation((): undefined => undefined);
	});

	afterEach(async () => {
		await PostgresListener.stop();
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it('should resolve stop when no instance exists', async () => {
		await expect(PostgresListener.stop()).resolves.toBeUndefined();
		expect(PostgresListener.instance).toBeUndefined();
	});

	it('should connect, listen and emit a live lifecycle event on init', async () => {
		const listener: PostgresListener = PostgresListener.init({host: 'h'}, 'chan');
		await flush();

		expect(PostgresListener.instance).toBe(listener);
		expect(listener.channel).toBe('chan');
		expect(ClientMock).toHaveBeenCalledWith({host: 'h'});
		expect(clients[0].connect).toHaveBeenCalledTimes(1);
		expect(clients[0].query).toHaveBeenCalledWith('LISTEN "chan"');
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('listening on channel "chan"'));

		const events: any[] = [];
		listener.lifecycle.subscribe((event: any): void => {
			events.push(event);
		});
		expect(events).toEqual([{type: 'live', collection: 'chan', timestamp: expect.any(Date)}]);
	});

	it('should reuse the singleton and default the channel name', async () => {
		const listener: PostgresListener = PostgresListener.init({});
		expect(listener.channel).toBe('owservable');
		expect(PostgresListener.init({}, 'other')).toBe(listener);
		await flush();
		expect(ClientMock).toHaveBeenCalledTimes(1);
	});

	it('should emit parsed notification payloads', async () => {
		const listener: PostgresListener = PostgresListener.init({});
		await flush();

		const received: any[] = [];
		listener.notifications.subscribe((notification: any): void => {
			received.push(notification);
		});

		clients[0].handlers['notification']({payload: '{"table":"users","op":"insert","id":"1"}'});
		expect(received).toEqual([{table: 'users', op: 'insert', id: '1'}]);
	});

	it('should log an error for unparsable notification payloads', async () => {
		const listener: PostgresListener = PostgresListener.init({});
		await flush();

		const received: any[] = [];
		listener.notifications.subscribe((notification: any): void => {
			received.push(notification);
		});

		clients[0].handlers['notification']({payload: 'not json'});
		clients[0].handlers['notification'](undefined);

		expect(received).toEqual([]);
		expect(errorSpy).toHaveBeenCalledTimes(2);
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error parsing notification payload'), 'not json', expect.anything());
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error parsing notification payload'), undefined, expect.anything());
	});

	it('should reconnect with exponential backoff capped at 30s and reset it after a successful reconnect', async () => {
		jest.useFakeTimers(FAKE_TIMER_OPTIONS);
		const listener: PostgresListener = PostgresListener.init({});
		await flush();

		const events: any[] = [];
		listener.lifecycle.subscribe((event: any): void => {
			events.push(event);
		});

		ClientMock.mockImplementation((): any => {
			const client: any = createFakeClient();
			client.connect.mockRejectedValue(new Error('down'));
			return client;
		});

		clients[0].handlers['error'](new Error('boom'));
		await flush();
		expect(events.filter((event: any): boolean => 'error' === event.type)).toHaveLength(1);
		expect(clients[0].removeAllListeners).toHaveBeenCalledTimes(1);
		expect(clients[0].end).toHaveBeenCalledTimes(1);
		expect(infoSpy).toHaveBeenLastCalledWith(expect.stringContaining('Reconnecting in 1000ms'));

		await jest.advanceTimersByTimeAsync(1000);
		expect(infoSpy).toHaveBeenLastCalledWith(expect.stringContaining('Reconnecting in 2000ms'));
		await jest.advanceTimersByTimeAsync(2000);
		expect(infoSpy).toHaveBeenLastCalledWith(expect.stringContaining('Reconnecting in 4000ms'));
		await jest.advanceTimersByTimeAsync(4000);
		expect(infoSpy).toHaveBeenLastCalledWith(expect.stringContaining('Reconnecting in 8000ms'));
		await jest.advanceTimersByTimeAsync(8000);
		expect(infoSpy).toHaveBeenLastCalledWith(expect.stringContaining('Reconnecting in 16000ms'));
		await jest.advanceTimersByTimeAsync(16000);
		expect(infoSpy).toHaveBeenLastCalledWith(expect.stringContaining('Reconnecting in 30000ms'));
		await jest.advanceTimersByTimeAsync(30000);
		expect(infoSpy).toHaveBeenLastCalledWith(expect.stringContaining('Reconnecting in 30000ms'));

		ClientMock.mockImplementation(createFakeClient);
		await jest.advanceTimersByTimeAsync(30000);

		expect(events.filter((event: any): boolean => 'live' === event.type)).toHaveLength(2);

		clients[clients.length - 1].handlers['error'](new Error('again'));
		await flush();
		expect(infoSpy).toHaveBeenLastCalledWith(expect.stringContaining('Reconnecting in 1000ms'));
	});

	it('should reconnect when the connection ends unexpectedly', async () => {
		jest.useFakeTimers(FAKE_TIMER_OPTIONS);
		PostgresListener.init({});
		await flush();

		clients[0].handlers['end']();

		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('connection ended, attempting reconnection'));
		expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Reconnecting in 1000ms'));
	});

	it('should ignore end events after stop', async () => {
		PostgresListener.init({});
		await flush();
		const endHandler: (...args: any[]) => void = clients[0].handlers['end'];

		await PostgresListener.stop();
		warnSpy.mockClear();
		infoSpy.mockClear();

		endHandler();

		expect(warnSpy).not.toHaveBeenCalled();
		expect(infoSpy).not.toHaveBeenCalled();
	});

	it('should not handle failures after stop', async () => {
		PostgresListener.init({});
		await flush();
		const errorHandler: (...args: any[]) => void = clients[0].handlers['error'];

		await PostgresListener.stop();
		infoSpy.mockClear();

		errorHandler(new Error('late'));

		expect(infoSpy).not.toHaveBeenCalled();
	});

	it('should log cleanup errors while handling a failure', async () => {
		jest.useFakeTimers(FAKE_TIMER_OPTIONS);
		PostgresListener.init({});
		await flush();

		clients[0].removeAllListeners.mockImplementation((): never => {
			throw new Error('cleanup failed');
		});

		clients[0].handlers['error'](new Error('boom'));

		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error cleaning up old client'), expect.any(Error));
	});

	it('should swallow end rejections while cleaning up the old client', async () => {
		jest.useFakeTimers(FAKE_TIMER_OPTIONS);
		PostgresListener.init({});
		await flush();

		clients[0].end.mockRejectedValue(new Error('end failed'));

		clients[0].handlers['error'](new Error('boom'));
		await flush();

		expect(clients[0].end).toHaveBeenCalledTimes(1);
		expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Reconnecting in 1000ms'));
	});

	it('should handle a client that fails to construct', async () => {
		jest.useFakeTimers(FAKE_TIMER_OPTIONS);
		ClientMock.mockImplementation((): never => {
			throw new Error('constructor failed');
		});

		const listener: PostgresListener = PostgresListener.init({});
		const events: any[] = [];
		listener.lifecycle.subscribe((event: any): void => {
			events.push(event);
		});
		await flush();

		expect(events.some((event: any): boolean => 'error' === event.type)).toBe(true);
		expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Reconnecting in 1000ms'));

		await PostgresListener.stop();
		expect(events.some((event: any): boolean => 'close' === event.type)).toBe(true);
		expect(PostgresListener.instance).toBeNull();
	});

	it('should end the client and emit a close lifecycle event on stop', async () => {
		const listener: PostgresListener = PostgresListener.init({});
		await flush();

		const events: any[] = [];
		listener.lifecycle.subscribe((event: any): void => {
			events.push(event);
		});

		await PostgresListener.stop();

		expect(clients[0].removeAllListeners).toHaveBeenCalledTimes(1);
		expect(clients[0].end).toHaveBeenCalledTimes(1);
		expect(events.some((event: any): boolean => 'close' === event.type)).toBe(true);
		expect(PostgresListener.instance).toBeNull();
	});

	it('should log errors raised while stopping', async () => {
		PostgresListener.init({});
		await flush();

		clients[0].end.mockRejectedValue(new Error('stop failed'));

		await PostgresListener.stop();

		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error stopping'), expect.any(Error));
	});
});
