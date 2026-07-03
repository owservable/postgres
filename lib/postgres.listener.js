'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const rxjs_1 = require("rxjs");
const RECONNECT_INITIAL_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
class PostgresListener {
    static init(config, channel = 'owservable') {
        if (!PostgresListener._instance)
            PostgresListener._instance = new PostgresListener(config, channel);
        return PostgresListener._instance;
    }
    static get instance() {
        return PostgresListener._instance;
    }
    static stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!PostgresListener._instance)
                return;
            yield PostgresListener._instance._stop();
            PostgresListener._instance = null;
        });
    }
    constructor(config, channel) {
        this._stopped = false;
        this._reconnectDelay = RECONNECT_INITIAL_DELAY;
        this._config = config;
        this._channel = channel;
        this.notifications = new rxjs_1.Subject();
        this.lifecycle = new rxjs_1.ReplaySubject(1);
        this._connect()
            .then(() => null)
            .catch((error) => this._handleFailure(error));
    }
    get channel() {
        return this._channel;
    }
    _connect() {
        return __awaiter(this, void 0, void 0, function* () {
            this._client = new pg_1.Client(this._config);
            this._client.on('notification', (message) => {
                try {
                    const notification = JSON.parse(message.payload);
                    this.notifications.next(notification);
                }
                catch (error) {
                    console.error(`[@owservable/postgres] -> PostgresListener[${this._channel}] Error parsing notification payload:`, message === null || message === void 0 ? void 0 : message.payload, error);
                }
            });
            this._client.on('error', (error) => {
                console.error(`[@owservable/postgres] -> PostgresListener[${this._channel}] connection error:`, error, ', attempting reconnection...');
                this._handleFailure(error);
            });
            this._client.on('end', () => {
                if (this._stopped)
                    return;
                console.warn(`[@owservable/postgres] -> PostgresListener[${this._channel}] connection ended, attempting reconnection...`);
                this._handleFailure();
            });
            yield this._client.connect();
            yield this._client.query(`LISTEN "${this._channel}"`);
            this._reconnectDelay = RECONNECT_INITIAL_DELAY;
            this.lifecycle.next({
                type: 'live',
                collection: this._channel,
                timestamp: new Date()
            });
            console.log(`[@owservable/postgres] -> PostgresListener listening on channel "${this._channel}"`);
        });
    }
    _handleFailure(error) {
        var _a, _b;
        if (this._stopped)
            return;
        this.lifecycle.next({
            type: 'error',
            collection: this._channel,
            timestamp: new Date(),
            error
        });
        try {
            (_a = this._client) === null || _a === void 0 ? void 0 : _a.removeAllListeners();
            (_b = this._client) === null || _b === void 0 ? void 0 : _b.end().catch(() => null);
        }
        catch (cleanupError) {
            console.error(`[@owservable/postgres] -> PostgresListener[${this._channel}] Error cleaning up old client:`, cleanupError);
        }
        const delay = this._reconnectDelay;
        this._reconnectDelay = Math.min(this._reconnectDelay * 2, RECONNECT_MAX_DELAY);
        console.info(`[@owservable/postgres] -> PostgresListener[${this._channel}] Reconnecting in ${delay}ms...`);
        setTimeout(() => {
            this._connect()
                .then(() => null)
                .catch((reconnectError) => this._handleFailure(reconnectError));
        }, delay);
    }
    _stop() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            this._stopped = true;
            this.lifecycle.next({
                type: 'close',
                collection: this._channel,
                timestamp: new Date()
            });
            try {
                (_a = this._client) === null || _a === void 0 ? void 0 : _a.removeAllListeners();
                yield ((_b = this._client) === null || _b === void 0 ? void 0 : _b.end());
            }
            catch (error) {
                console.error(`[@owservable/postgres] -> PostgresListener[${this._channel}] Error stopping:`, error);
            }
        });
    }
}
exports.default = PostgresListener;
//# sourceMappingURL=postgres.listener.js.map